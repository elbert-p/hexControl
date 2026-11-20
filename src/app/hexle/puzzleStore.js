// src/app/hexle/puzzleStore.js
// Shared Supabase cache of generated daily puzzles (table `daily_puzzles`, see supabase/hexle.sql).
// Whoever generates a day's puzzle first uploads it; everyone else just downloads it.
// Generation is seeded, so any honest client produces the identical map — the cache only
// saves time. Downloaded maps are verified before use, so a bad row can't break a day.

import { supabase } from "../../supabaseClient";
import { hashString } from "../seededRandom";

const TABLE = "daily_puzzles";

// Bump if the generation algorithm changes in a way settings don't capture.
const ALGORITHM_VERSION = "v1";

/** Cache key for a generator's settings, so tweaking A–E settings never serves stale maps. */
export function genVersion(generationSettings = {}) {
  const {
    cellCount, spreadFactor, directionBias, colorRatio, colorToWin,
    regionSize, maxSolutions, maxAttempts, difficultyThreshold,
  } = generationSettings; // deliberately skips `baseData` (randomized at import)
  const key = JSON.stringify([
    ALGORITHM_VERSION, cellCount, spreadFactor, directionBias, colorRatio,
    colorToWin, regionSize, maxSolutions, maxAttempts, difficultyThreshold,
  ]);
  return hashString(key).toString(36);
}

// If the table isn't there (migration not run) or Supabase is unreachable, stop trying
// for this page session and fall back to purely local generation.
let remoteDisabled = false;
export const isRemoteAvailable = () => !remoteDisabled;

function handleError(error, what) {
  if (!error) return false;
  const missingTable =
    error.code === "42P01" || error.code === "PGRST205" || error.code === "PGRST116" ||
    /does not exist|schema cache/i.test(error.message || "");
  if (missingTable || error.status === 404) remoteDisabled = true;
  console.warn(`[hexle] ${what} failed:`, error.message || error);
  return true;
}

/** Keep only the fields a map cell should have. */
function sanitizeMap(map) {
  if (!Array.isArray(map)) return null;
  return map.map((h) => ({ q: Number(h?.q), r: Number(h?.r), s: Number(h?.s), color: Number(h?.color) }));
}

/** Fetch one finished puzzle: { map, attempt } or null. */
export async function fetchRemoteMap(dateKey, id, version) {
  if (remoteDisabled) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("map, attempt")
      .eq("puzzle_date", dateKey)
      .eq("puzzle_id", id)
      .eq("gen_version", version)
      .not("map", "is", null)
      .limit(1);
    if (handleError(error, "fetch")) return null;
    const row = data?.[0];
    if (!row || !Number.isInteger(row.attempt)) return null;
    const map = sanitizeMap(row.map);
    return map ? { map, attempt: row.attempt } : null;
  } catch (err) {
    handleError(err, "fetch");
    return null;
  }
}

/** Status of every row for these dates: Map(`${date}:${id}:${version}` -> { done, claimedAt }). */
export async function fetchRemoteStatus(dateKeys) {
  if (remoteDisabled) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("puzzle_date, puzzle_id, gen_version, attempt, claimed_at")
      .in("puzzle_date", dateKeys);
    if (handleError(error, "status")) return null;
    const status = new Map();
    (data || []).forEach((row) => {
      status.set(`${row.puzzle_date}:${row.puzzle_id}:${row.gen_version}`, {
        done: Number.isInteger(row.attempt),
        claimedAt: row.claimed_at ? Date.parse(row.claimed_at) : 0,
      });
    });
    return status;
  } catch (err) {
    handleError(err, "status");
    return null;
  }
}

/**
 * Mark a puzzle as "being generated" so other open sites don't duplicate the work.
 * Returns true if we own the claim. `staleClaimAt` (ms) takes over an abandoned claim.
 */
export async function claimRemote(dateKey, id, version, staleClaimAt = null) {
  if (remoteDisabled) return false;
  try {
    const now = new Date().toISOString();
    if (staleClaimAt == null) {
      const { error } = await supabase
        .from(TABLE)
        .insert({ puzzle_date: dateKey, puzzle_id: id, gen_version: version, claimed_at: now });
      if (error?.code === "23505") return false; // someone else got there first
      return !handleError(error, "claim");
    }
    const { data, error } = await supabase
      .from(TABLE)
      .update({ claimed_at: now })
      .eq("puzzle_date", dateKey)
      .eq("puzzle_id", id)
      .eq("gen_version", version)
      .is("map", null)
      .eq("claimed_at", new Date(staleClaimAt).toISOString())
      .select("puzzle_id");
    if (handleError(error, "reclaim")) return false;
    return (data || []).length > 0;
  } catch (err) {
    handleError(err, "claim");
    return false;
  }
}

/** Upload a generated map (first finished map wins; later uploads are no-ops). */
export async function uploadRemoteMap(dateKey, id, version, map, attempt) {
  if (remoteDisabled) return;
  try {
    const row = { puzzle_date: dateKey, puzzle_id: id, gen_version: version, map, attempt };
    const { error } = await supabase.from(TABLE).insert(row);
    if (!error) return;
    if (error.code !== "23505") {
      handleError(error, "upload");
      return;
    }
    // A claim (or a finished map) already exists: fill it only if it's still empty.
    const { error: updateError } = await supabase
      .from(TABLE)
      .update({ map, attempt })
      .eq("puzzle_date", dateKey)
      .eq("puzzle_id", id)
      .eq("gen_version", version)
      .is("map", null);
    handleError(updateError, "upload");
  } catch (err) {
    handleError(err, "upload");
  }
}
