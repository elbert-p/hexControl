// src/context/AuthContext.js
"use client";
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);

  // Track the previously‑seen user so we can detect *real* account switches.
  const prevUserIdRef = useRef(null);

  // Forces re‑renders in components that watch localStorage‑backed data.
  const [localDataVersion, setLocalDataVersion] = useState(0);

  useEffect(() => {
    let authSubscription = null;
    let cancelled = false; // in case the component unmounts before init completes

    /**
     * Initialise auth:
     *   1. Rehydrate the session first.
     *   2. Then attach the onAuthStateChange listener so we never handle a
     *      SIGNED_IN event before we know who the previous user was.
     */
    const initAuth = async () => {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (cancelled) return; // component unmounted while awaiting

      setSession(initialSession);
      prevUserIdRef.current = initialSession?.user?.id || null;

      // Now that we know the current user, subscribe to auth changes.
      authSubscription = supabase.auth.onAuthStateChange(
        async (event, currentSession) => {
          // Supabase v2 fires INITIAL_SESSION right after subscription – ignore it.
          if (event === "INITIAL_SESSION") return;

          if (event === "SIGNED_IN" && currentSession?.user) {
            const newUserId = currentSession.user.id;

            // Only treat as a *new* sign‑in if the user actually changed.
            if (newUserId !== prevUserIdRef.current) {
              console.log("User signed in:", currentSession.user);
              console.log("Backing up local profile");
              backupLocalProfile();
              await syncNewAccount(currentSession.user);
              prevUserIdRef.current = newUserId;
            }
          }

          if (event === "SIGNED_OUT") {
            console.log("User signed out, restoring local profile");
            restoreLocalProfileBackup();
            prevUserIdRef.current = null;
          }

          setSession(currentSession);
        }
      ).data; // .data holds the subscription object
    };

    initAuth();

    return () => {
      cancelled = true;
      authSubscription?.unsubscribe();
    };
  }, []);

  /**
   * Bump a local version counter (forces re‑renders) and, if logged in, push
   * localStorage data to Supabase.
   */
  const notifyLocalDataUpdated = async () => {
    setLocalDataVersion((v) => v + 1);
    if (session?.user) await syncLocalDataToSupabase();
  };

  /**
   * Push the local profile (stored in localStorage) to the logged‑in user's row
   * in Supabase.
   */
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

      const { error } = await supabase.from("profiles").upsert({
        id: session.user.id,
        email: session.user.email,
        completed_puzzles: localCompletedPuzzles,
        last_version: localLastVersion,
        puzzle_completion_counts: localPuzzleCompletionCounts,
      });

      if (error) console.error("Error upserting local data:", error);
    } catch (err) {
      console.error("Error syncing local data:", err);
    }
    console.log("Local data synced to Supabase");
  };

  /** Backup / restore helpers **/
  const backupLocalProfile = () => {
    const localData = {
      completedPuzzles: localStorage.getItem("completedPuzzles"),
      lastVersion: localStorage.getItem("lastVersion"),
      puzzleCompletionCounts: localStorage.getItem("puzzleCompletionCounts"),
    };
    localStorage.setItem("localProfileBackup", JSON.stringify(localData));
  };

  const restoreLocalProfileBackup = () => {
    const backup = localStorage.getItem("localProfileBackup");
    if (!backup) {
      localStorage.removeItem("completedPuzzles");
      localStorage.removeItem("puzzleCompletionCounts");
      notifyLocalDataUpdated();
      return;
    }

    try {
      const localData = JSON.parse(backup);
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
      console.error("Error restoring local profile backup:", err);
    }
  };

  /**
   * When a *different* user signs in for the first time, decide whether to push
   * local data up or pull remote data down.
   */
  const syncNewAccount = async (user) => {
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
        console.error("Error fetching profile:", fetchError.message);
        return;
      }

      const hasAnyData =
        profileData?.completed_puzzles?.length > 0 ||
        profileData?.last_version > 0 ||
        (profileData?.puzzle_completion_counts &&
          Object.keys(profileData.puzzle_completion_counts).length > 0);

      if (!hasAnyData) {
        if (
          localCompletedPuzzles.length > 0 ||
          localLastVersion > 0 ||
          Object.keys(localPuzzleCompletionCounts).length > 0
        ) {
          const { error: upsertError } = await supabase.from("profiles").upsert({
            id: user.id,
            email: user.email,
            completed_puzzles: localCompletedPuzzles,
            last_version: localLastVersion,
            puzzle_completion_counts: localPuzzleCompletionCounts,
          });
          if (upsertError) {
            console.error("Error upserting new profile:", upsertError.message);
          } else {
            localStorage.removeItem("localProfileBackup");
          }
        }
      } else {
        // Pull existing remote data down into localStorage
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
        notifyLocalDataUpdated();
      }
    } catch (err) {
      console.error("Error syncing new account:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        localDataVersion, // increments whenever localStorage is changed
        notifyLocalDataUpdated, // call this after you mutate localStorage
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
