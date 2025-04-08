"use client";
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);

  // Keep track of the previously known user ID (so we only run new-account sync for truly new logins).
  const prevUserIdRef = useRef(null);

  // Trigger re-renders in components that need to detect localStorage changes.
  const [localDataVersion, setLocalDataVersion] = useState(0);

  useEffect(() => {
    // 1. Check for an existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      prevUserIdRef.current = session?.user?.id || null;
    });

    // 2. Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (event === "SIGNED_IN" && currentSession?.user) {
          console.log("User signed in:", currentSession.user);
          const newUserId = currentSession.user.id;
          // Only do the "new account sync" if it's actually a different user
          if (newUserId !== prevUserIdRef.current) {
            console.log("Backing up local profile");
            backupLocalProfile();
            await syncNewAccount(currentSession.user);
          }
          prevUserIdRef.current = newUserId;
        }

        if (event === "SIGNED_OUT") {
          console.log("User signed out, restoring local profile");
          restoreLocalProfileBackup();
          prevUserIdRef.current = null;
        }

        setSession(currentSession);
      }
    );

    return () => {
      authListener.unsubscribe();
    };
  }, []);

  /**
   * Increments a local version number so components can react,
   * and also syncs localStorage data to Supabase if a user is logged in.
   */
  const notifyLocalDataUpdated = async () => {
    // 1. Increment the local version (triggers re-renders in subscribers)
    setLocalDataVersion((prev) => prev + 1);

    // 2. If user is logged in, upsert local data to Supabase
    if (session?.user) {
      await syncLocalDataToSupabase();
    }
  };

  /**
   * Syncs whatever is in localStorage to the logged-in user's profile row in Supabase.
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

      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({
          id: session.user.id,
          email: session.user.email,
          completed_puzzles: localCompletedPuzzles,
          last_version: localLastVersion,
          puzzle_completion_counts: localPuzzleCompletionCounts,
        });

      if (upsertError) {
        console.error("Error upserting local data to Supabase:", upsertError);
      } else {
        console.log("Local data synced to Supabase for the logged-in user.");
      }
    } catch (err) {
      console.error("Error syncing local data:", err);
    }
  };

  /**
   * Backup the current local profile so we can restore it later if someone else logs in.
   */
  function backupLocalProfile() {
    const localData = {
      completedPuzzles: localStorage.getItem("completedPuzzles"),
      lastVersion: localStorage.getItem("lastVersion"),
      puzzleCompletionCounts: localStorage.getItem("puzzleCompletionCounts"),
    };
    localStorage.setItem("localProfileBackup", JSON.stringify(localData));
  }

  /**
   * Restore the local profile from our backup key, if present.
   */
  function restoreLocalProfileBackup() {
    const backup = localStorage.getItem("localProfileBackup");
    if (!backup) {
      localStorage.removeItem("completedPuzzles");
      localStorage.removeItem("puzzleCompletionCounts");
      notifyLocalDataUpdated(); // Trigger re-renders
      return;
    }

    try {
      const localData = JSON.parse(backup);
      console.log("Restoring local profile from backup:", localData);

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
      // remove the backup key now that we've restored
      localStorage.removeItem("localProfileBackup");
      notifyLocalDataUpdated(); // Trigger re-renders
    } catch (err) {
      console.error("Error restoring local profile backup:", err);
    }
  }

  /**
   * If the user’s account (in Supabase) is new/empty, upserts the local data to that account.
   * If the account already has data, it replaces local with the existing Supabase data.
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
        console.error("Error fetching profile:", fetchError.message);
        return;
      }

      const hasAnyData =
        profileData?.completed_puzzles?.length > 0 ||
        profileData?.last_version > 0 ||
        (profileData?.puzzle_completion_counts &&
          Object.keys(profileData.puzzle_completion_counts).length > 0);

      // If the Supabase account is completely empty, upsert local data
      if (!hasAnyData) {
        if (
          localCompletedPuzzles.length > 0 ||
          localLastVersion > 0 ||
          Object.keys(localPuzzleCompletionCounts).length > 0
        ) {
          const { error: upsertError } = await supabase
            .from("profiles")
            .upsert({
              id: user.id,
              email: user.email,
              completed_puzzles: localCompletedPuzzles,
              last_version: localLastVersion,
              puzzle_completion_counts: localPuzzleCompletionCounts,
            });
          if (upsertError) {
            console.error("Error upserting new profile:", upsertError.message);
          } else {
            console.log("Local data saved to new account in Supabase.");
            localStorage.removeItem("localProfileBackup");
            console.log("Removed localProfileBackup")
          }
        }
      } else {
        // The account already has data in Supabase. Overwrite local with it:
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
        console.log("Account has data; local storage updated from Supabase.");
        notifyLocalDataUpdated(); // Trigger re-renders
      }
    } catch (err) {
      console.error("Error syncing new account:", err);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        localDataVersion,          // changes whenever local storage is updated
        notifyLocalDataUpdated,    // call this after you modify localStorage
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
