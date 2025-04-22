// src/context/AuthContext.js
/* eslint-disable no-console */
"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";

/**
 * ──────────────────────────────────────────────────────────────────────────────
 *  AuthContext
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Goals
 * ─────
 * 1. Avoid the race condition that appeared when a page was opened and then
 *    re‑loaded immediately (listener received SIGNED_IN before we knew the
 *    “previous” user).
 * 2. Still detect *real* sign‑ins after a redirect.
 * 3. Persist the last‑known user ID across hard reloads so we can distinguish
 *    “same user rehydrated” vs “different user signed in”.
 * 4. Keep all the original backup / restore / sync helpers.
 * 5. Add generous console logging so problems are easy to trace.
 * ──────────────────────────────────────────────────────────────────────────────
 */

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // ────────────────────────────────────────────────────────────────────────────
  //  React state & refs
  // ────────────────────────────────────────────────────────────────────────────
  const [session, setSession] = useState(null);

  /** ID of the user we *think* is currently signed in (persists in localStorage) */
  const prevUserIdRef = useRef(null);

  /** Bump this when localStorage is mutated so components can re‑render */
  const [localDataVersion, setLocalDataVersion] = useState(0);

  const router = useRouter();


  // ────────────────────────────────────────────────────────────────────────────
  //  1.  Initialise session, then subscribe to auth changes
  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let authSubscription;
    let isMounted = true; // safety guard in case component unmounts early

    /** One‑off initialisation */
    const init = async () => {
      // A. Read the user we *previously* knew about (if any) from localStorage
      const storedPrevUserId = localStorage.getItem("prevUserId");
      prevUserIdRef.current = storedPrevUserId;
      console.log("[Auth] Stored prevUserId =", storedPrevUserId);

      // B. Ask Supabase for the current session *before* attaching the listener
      const {
        data: { session: initialSession },
        error: initError,
      } = await supabase.auth.getSession();

      if (!isMounted) return; // component unmounted meanwhile

      if (initError) {
        console.error("[Auth] Error getting initial session:", initError);
      }

      console.log("[Auth] Initial session =", initialSession);
      setSession(initialSession);

      // C. If a user is present and it's *different* from what we had before,
      //    treat it as a real sign‑in (this happens after an auth redirect).
      if (initialSession?.user) {
        const { id: newUserId } = initialSession.user;
        if (newUserId !== storedPrevUserId) {
          console.log(
            "[Auth] Initial load detected *different* user → backup & sync"
          );
          backupLocalProfile();
          await syncNewAccount(initialSession.user);
        } else {
          console.log("[Auth] Initial load: same user, no backup needed");
        }
        // Persist current user
        prevUserIdRef.current = newUserId;
        localStorage.setItem("prevUserId", newUserId);
      }

      // D. Now attach the listener.  Because we already handled the session
      //    above, we *ignore* the INITIAL_SESSION event Supabase fires.
      authSubscription = supabase.auth
        .onAuthStateChange(async (event, currentSession) => {
          console.log("[Auth] Event:", event, currentSession);

          if (event === "INITIAL_SESSION") {
            // Already dealt with in (B) & (C)
            return;
          }

          if (event === "SIGNED_IN" && currentSession?.user) {
            const newUserId = currentSession.user.id;
            if (newUserId !== prevUserIdRef.current) {
              console.log(
                "[Auth] SIGNED_IN with a *different* user → backup & sync"
              );
              backupLocalProfile();
              await syncNewAccount(currentSession.user);
            } else {
              console.log("[Auth] SIGNED_IN for the same user → no backup");
            }
            prevUserIdRef.current = newUserId;
            localStorage.setItem("prevUserId", newUserId);
          }

          if (event === "SIGNED_OUT") {
            console.log("[Auth] SIGNED_OUT → restoring local profile backup");
            restoreLocalProfileBackup();
            prevUserIdRef.current = null;
            localStorage.removeItem("prevUserId");
            router.push('/');
          }

          // Any event updates the session in context
          setSession(currentSession);
        })
        .data; // .data contains the subscription object
    };

    init();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      authSubscription?.unsubscribe();
    };
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  //  2.  Helper: bump localDataVersion + optionally sync to Supabase
  // ────────────────────────────────────────────────────────────────────────────
  const notifyLocalDataUpdated = async () => {
    setLocalDataVersion((v) => v + 1);
    if (session?.user) {
      await syncLocalDataToSupabase();
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  //  3.  Data‑sync helpers  (unchanged except for extra logs)
  // ────────────────────────────────────────────────────────────────────────────
  const syncLocalDataToSupabase = async () => {
    if (!session?.user) return;
    try {
      const localCompletedPuzzles = JSON.parse(
        localStorage.getItem("completedPuzzles") || "[]"
      );
      const localLastVersion = parseInt(
        localStorage.getItem("lastVersion") || "0",
        10
      );
      const localPuzzleCompletionCounts = JSON.parse(
        localStorage.getItem("puzzleCompletionCounts") || "{}"
      );

      const { data: profileData, error: fetchError } = await supabase
      .from("profiles")
      .select("completed_puzzles, last_version, puzzle_completion_counts")
      .eq("id", session?.user.id)
      .maybeSingle();

      if (fetchError) {
        console.error("[Auth] Error fetching profile:", fetchError);
        return;
      }

      const mergedCompletedPuzzles = Array.from(
        new Set([...profileData.completed_puzzles || [], ...localCompletedPuzzles])
      );
      // For version: choose the higher version number.
      const mergedLastVersion = Math.max(profileData.last_version || 0, localLastVersion);
      // For puzzle counts: merge by taking the maximum count for each key.
      const mergedPuzzleCounts = { ...profileData.puzzle_completion_counts || {} };
      for (const key in localPuzzleCompletionCounts) {
        mergedPuzzleCounts[key] = Math.max(
          mergedPuzzleCounts[key] || 0,
          localPuzzleCompletionCounts[key]
        );
      }

      const { error } = await supabase.from("profiles").upsert({
        id: session.user.id,
        email: session.user.email,
        completed_puzzles: mergedCompletedPuzzles,
        last_version: mergedLastVersion,
        puzzle_completion_counts: mergedPuzzleCounts,
        // completed_puzzles: localCompletedPuzzles,
        // last_version: localLastVersion,
        // puzzle_completion_counts: localPuzzleCompletionCounts,
      });

      if (error) {
        console.error("[Auth] Error upserting local → Supabase:", error);
      } else {
        console.log("[Auth] Local data synced to Supabase");
      }
    } catch (err) {
      console.error("[Auth] Error syncing local data:", err);
    }
  };

  function backupLocalProfile() {
    const localData = {
      completedPuzzles: localStorage.getItem("completedPuzzles"),
      lastVersion: localStorage.getItem("lastVersion"),
      puzzleCompletionCounts: localStorage.getItem("puzzleCompletionCounts"),
    };
    localStorage.setItem("localProfileBackup", JSON.stringify(localData));
    console.log("[Auth] Local profile backed up");
  }

  function restoreLocalProfileBackup() {
    const backup = localStorage.getItem("localProfileBackup");
    if (!backup) {
      console.log("[Auth] No backup found, clearing local profile keys");
      localStorage.removeItem("completedPuzzles");
      localStorage.removeItem("puzzleCompletionCounts");
      notifyLocalDataUpdated();
      return;
    }

    try {
      const localData = JSON.parse(backup);
      console.log("[Auth] Restoring profile from backup:", localData);

      if (localData.completedPuzzles !== null) {
        localStorage.setItem("completedPuzzles", localData.completedPuzzles);
      } else {
        localStorage.removeItem("completedPuzzles");
      }

      if (localData.lastVersion !== null) {
        localStorage.setItem("lastVersion", localData.lastVersion);
      } else {
        localStorage.removeItem("lastVersion");
      }

      if (localData.puzzleCompletionCounts !== null) {
        localStorage.setItem(
          "puzzleCompletionCounts",
          localData.puzzleCompletionCounts
        );
      } else {
        localStorage.removeItem("puzzleCompletionCounts");
      }

      localStorage.removeItem("localProfileBackup");
      notifyLocalDataUpdated();
    } catch (err) {
      console.error("[Auth] Error restoring profile backup:", err);
    }
  }

  /**
   * If the Supabase account is empty, push local data up.
   * Otherwise overwrite localStorage with Supabase data.
   */
  async function syncNewAccount(user) {
    try {
      const localCompletedPuzzles = JSON.parse(
        localStorage.getItem("completedPuzzles") || "[]"
      );
      const localLastVersion = parseInt(
        localStorage.getItem("lastVersion") || "0",
        10
      );
      const localPuzzleCompletionCounts = JSON.parse(
        localStorage.getItem("puzzleCompletionCounts") || "{}"
      );

      const { data: profileData, error: fetchError } = await supabase
        .from("profiles")
        .select("completed_puzzles, last_version, puzzle_completion_counts")
        .eq("id", user.id)
        .maybeSingle();

      if (fetchError) {
        console.error("[Auth] Error fetching profile:", fetchError);
        return;
      }

      const hasAnyData =
        profileData?.completed_puzzles?.length > 0;
        // || profileData?.last_version > 0 ||
        // (profileData?.puzzle_completion_counts &&
        //   Object.keys(profileData.puzzle_completion_counts).length > 0);

      if (!hasAnyData) {
        // Push local → Supabase
        if (
          localCompletedPuzzles.length
          // || localLastVersion > 0 ||
          // Object.keys(localPuzzleCompletionCounts).length
        ) {
          const { error: upsertError } = await supabase.from("profiles").upsert({
            id: user.id,
            email: user.email,
            completed_puzzles: localCompletedPuzzles,
            last_version: localLastVersion,
            puzzle_completion_counts: localPuzzleCompletionCounts,
          });

          if (upsertError) {
            console.error("[Auth] Error upserting new profile:", upsertError);
          } else {
            console.log("[Auth] Local data pushed to *new* Supabase account");
            localStorage.removeItem("localProfileBackup");
          }
        }
      } else {
        // Pull Supabase → local
        localStorage.setItem(
          "completedPuzzles",
          JSON.stringify(profileData.completed_puzzles || [])
        );
        localStorage.setItem(
          "lastVersion",
          (profileData.last_version || 0).toString()
        );
        localStorage.setItem(
          "puzzleCompletionCounts",
          JSON.stringify(profileData.puzzle_completion_counts || {})
        );
        console.log("[Auth] Local storage updated from existing Supabase data");
        notifyLocalDataUpdated();
        router.push('/');
      }
    } catch (err) {
      console.error("[Auth] Error in syncNewAccount:", err);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  4.  Context value
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <AuthContext.Provider
      value={{
        session,
        localDataVersion,
        notifyLocalDataUpdated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
