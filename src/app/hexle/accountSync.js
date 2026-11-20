// src/app/hexle/accountSync.js
// Keeps the signed-in account's Hexle data (profiles.hexle_history / profiles.hexle_daily)
// in step with this device. Kept separate from the main profile upsert so that if the
// columns don't exist yet, the existing level-progress sync keeps working.

import { supabase } from "../../supabaseClient";
import { mergeHexleHistory, pickHexleDaily, readLocalHexle, writeLocalHexle } from "./daily";

let columnsMissing = false;

async function fetchAccountHexle(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("hexle_history, hexle_daily")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    if (error.code === "42703" || /column/i.test(error.message || "")) columnsMissing = true;
    console.warn("[hexle] Could not read account Hexle data:", error.message);
    return null;
  }
  return { history: data?.hexle_history || {}, daily: data?.hexle_daily || null };
}

/**
 * Merge account ⇄ device Hexle data and save the result to both sides.
 * `applyDaily`: also overwrite this device's in-progress day if the account's is further
 * along (done on load / sign-in, not while a game might be running in this tab).
 * Returns true if this device's localStorage changed.
 */
export async function syncHexleWithAccount(user, { applyDaily = false } = {}) {
  if (!user || columnsMissing) return false;
  try {
    const remote = await fetchAccountHexle(user.id);
    if (!remote) return false;
    const local = readLocalHexle();

    // Account wins for a day recorded on both (it was saved first).
    const history = mergeHexleHistory(remote.history, local.history);
    const daily = pickHexleDaily(remote.daily, local.daily);

    let localChanged = false;
    if (JSON.stringify(history) !== JSON.stringify(local.history)) {
      writeLocalHexle({ history });
      localChanged = true;
    }
    if (applyDaily && daily && JSON.stringify(daily) !== JSON.stringify(local.daily)) {
      writeLocalHexle({ daily });
      localChanged = true;
    }

    const remoteChanged =
      JSON.stringify(history) !== JSON.stringify(remote.history) ||
      JSON.stringify(daily) !== JSON.stringify(remote.daily);
    if (remoteChanged) {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, email: user.email, hexle_history: history, hexle_daily: daily });
      if (error) console.warn("[hexle] Could not save Hexle data to account:", error.message);
    }
    return localChanged;
  } catch (err) {
    console.warn("[hexle] Account sync failed:", err);
    return false;
  }
}
