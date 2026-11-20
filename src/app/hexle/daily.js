// src/app/hexle/daily.js
// Everything about the daily Hexle that isn't UI: dates, deterministic puzzle maps,
// progress persistence, history/stats and the share text.

import puzzles from "../puzzleData";
import runPuzzleWorker, { verifyPuzzleMap } from "../runPuzzleWorker";
import {
  claimRemote,
  fetchRemoteMap,
  fetchRemoteStatus,
  genVersion,
  isRemoteAvailable,
  uploadRemoteMap,
} from "./puzzleStore";

/** Generators used for today's gauntlet, in play order. */
export const DAILY_PUZZLE_IDS = ["A", "B", "C", "D", "E"];
export const DAILY_PUZZLES = DAILY_PUZZLE_IDS.map((id) => puzzles.find((p) => p.id === id));
export const DAILY_COUNT = DAILY_PUZZLE_IDS.length;

/** Hexle #1 is this local date. */
export const HEXLE_EPOCH = "2026-11-19";

const STATE_KEY = "hexleDaily";
const MAPS_KEY = "hexleMaps";
const HISTORY_KEY = "hexleHistory";

/* ─────────────────────────── dates ─────────────────────────── */

const pad = (n) => String(n).padStart(2, "0");

/** Local calendar date as YYYY-MM-DD (the day rolls over at local midnight). */
export function getTodayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Whole-day index for a date key; uses UTC math so DST can't skew day differences. */
export function dayIndex(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

export function getHexleNumber(dateKey) {
  return dayIndex(dateKey) - dayIndex(HEXLE_EPOCH) + 1;
}

export function msUntilLocalMidnight(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

/* ─────────────────────────── formatting ─────────────────────────── */

/** m:ss, or h:mm:ss past an hour. */
export function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor((ms || 0) / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** hh:mm:ss, used for the "next Hexle" countdown. */
export function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/* ─────────────────────────── storage helpers ─────────────────────────── */

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`Failed to read ${key}:`, err);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to write ${key}:`, err);
  }
}

/* ─────────────────────────── daily maps ─────────────────────────── */
// Lookup order: memory → this device's cache → shared Supabase cache (verified) → generate
// locally (and upload for everyone else). Maps live in their own localStorage key, written
// only here, so they never race with the timer's frequent progress writes.

const POLL_REMOTE_MS = 5000; // while generating, check whether someone else finished first
const CLAIM_TTL_MS = 10 * 60 * 1000; // a "generating" claim older than this is abandoned

const memoryMaps = {}; // `${date}:${id}` -> { map, attempt }
const pendingMaps = {}; // `${date}:${id}` -> { promise, generating, listeners }
const badRemote = new Set(); // remote rows that failed verification this session

const seedFor = (dateKey, id) => `hexle:${dateKey}:${id}`;
const puzzleFor = (id) => DAILY_PUZZLES.find((p) => p.id === id);

function readStoredMaps(dateKey) {
  const stored = readJSON(MAPS_KEY, null);
  return stored && stored.date === dateKey
    ? { maps: stored.maps || {}, attempts: stored.attempts || {} }
    : { maps: {}, attempts: {} };
}

function getCachedEntry(dateKey, id) {
  const mem = memoryMaps[`${dateKey}:${id}`];
  if (mem) return mem;
  const stored = readStoredMaps(dateKey);
  return stored.maps[id] ? { map: stored.maps[id], attempt: stored.attempts[id] ?? null } : null;
}

export function getCachedDailyMap(dateKey, id) {
  return getCachedEntry(dateKey, id)?.map ?? null;
}

function cacheMap(dateKey, id, entry) {
  memoryMaps[`${dateKey}:${id}`] = entry;
  // Only today's puzzles are kept on the device; upcoming ones live in Supabase.
  if (dateKey !== getTodayKey()) return;
  const stored = readStoredMaps(dateKey);
  writeJSON(MAPS_KEY, {
    date: dateKey,
    maps: { ...stored.maps, [id]: entry.map },
    attempts: { ...stored.attempts, [id]: entry.attempt },
  });
}

/** Download a shared map and verify it really is this day's seeded puzzle. */
async function fetchVerifiedRemote(dateKey, id, version) {
  const key = `${dateKey}:${id}`;
  if (badRemote.has(key)) return null;
  const remote = await fetchRemoteMap(dateKey, id, version);
  if (!remote) return null;
  const settings = puzzleFor(id).generationSettings;
  if (await verifyPuzzleMap(settings, seedFor(dateKey, id), remote.map, remote.attempt)) return remote;
  console.warn(`[hexle] Ignoring invalid shared map for ${key}`);
  badRemote.add(key);
  return null;
}

async function resolveMap(dateKey, id, entry) {
  const settings = puzzleFor(id).generationSettings;
  const version = genVersion(settings);

  const remote = await fetchVerifiedRemote(dateKey, id, version);
  if (remote) return remote;

  // Nobody has shared it yet: generate it here...
  entry.generating = true;
  entry.listeners.forEach((fn) => fn());

  const controller = new AbortController();
  let pollTimer;
  const local = runPuzzleWorker(settings, seedFor(dateKey, id), { signal: controller.signal }).then(
    ({ puzzleMap, attempt }) => {
      uploadRemoteMap(dateKey, id, version, puzzleMap, attempt); // share it (fire and forget)
      return { map: puzzleMap, attempt };
    }
  );
  local.catch(() => {}); // the race below reports errors; avoid unhandled rejections after abort

  // ...but keep checking whether another player finishes it first.
  const shared = new Promise((resolve) => {
    const tick = async () => {
      if (controller.signal.aborted || !isRemoteAvailable()) return;
      const found = await fetchVerifiedRemote(dateKey, id, version);
      if (found && !controller.signal.aborted) resolve(found);
      else if (!controller.signal.aborted) pollTimer = setTimeout(tick, POLL_REMOTE_MS);
    };
    pollTimer = setTimeout(tick, POLL_REMOTE_MS);
  });

  try {
    return await Promise.race([local, shared]);
  } finally {
    clearTimeout(pollTimer);
    controller.abort(); // stops whichever lost the race
  }
}

/**
 * Resolve a day's map for a generator id. `onGenerating` is called if (and when) the map
 * has to be generated on this device, as opposed to loaded from a cache.
 */
export function getDailyMap(dateKey, id, { onGenerating } = {}) {
  const key = `${dateKey}:${id}`;
  const cached = getCachedEntry(dateKey, id);
  if (cached) return Promise.resolve(cached.map);

  let entry = pendingMaps[key];
  if (!entry) {
    entry = { generating: false, listeners: new Set() };
    pendingMaps[key] = entry;
    entry.promise = resolveMap(dateKey, id, entry)
      .then((result) => {
        cacheMap(dateKey, id, result);
        return result.map;
      })
      .finally(() => {
        delete pendingMaps[key];
      });
  }
  if (onGenerating) {
    if (entry.generating) onGenerating();
    else entry.listeners.add(onGenerating);
  }
  return entry.promise;
}

/** Kick off loading of every puzzle for the day (no-op for ones already cached). */
export function prefetchDailyMaps(dateKey) {
  DAILY_PUZZLE_IDS.forEach((id) => {
    getDailyMap(dateKey, id).catch((err) => console.error(`Hexle ${id} generation failed:`, err));
  });
}

/** Local date keys for today and the following days. */
export function upcomingDateKeys(days, now = new Date()) {
  return Array.from({ length: days }, (_, d) =>
    getTodayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + d))
  );
}

/**
 * Make sure the shared cache holds every daily puzzle for the coming week, closest day
 * first. Runs one puzzle at a time, in one tab per browser, and claims each puzzle so
 * other open sites don't generate the same one.
 */
async function prefetchUpcoming(days) {
  const dates = upcomingDateKeys(days);
  const status = await fetchRemoteStatus(dates);
  if (!status) return; // shared cache unavailable: don't spend CPU on future days

  for (const dateKey of dates) {
    for (const puzzle of DAILY_PUZZLES) {
      if (!isRemoteAvailable()) return;
      const version = genVersion(puzzle.generationSettings);
      const row = status.get(`${dateKey}:${puzzle.id}:${version}`);
      if (row?.done) continue;
      if (row && Date.now() - row.claimedAt < CLAIM_TTL_MS) continue; // someone else is on it

      // Already generated on this device (e.g. today's, before the upload landed)?
      const cached = getCachedEntry(dateKey, puzzle.id);
      if (cached) {
        // (Maps cached before attempts were recorded can't be verified; let another site share it.)
        if (Number.isInteger(cached.attempt)) {
          await uploadRemoteMap(dateKey, puzzle.id, version, cached.map, cached.attempt);
        }
        continue;
      }

      if (!(await claimRemote(dateKey, puzzle.id, version, row ? row.claimedAt : null))) continue;
      try {
        await getDailyMap(dateKey, puzzle.id); // generates + uploads (or finds it shared meanwhile)
      } catch (err) {
        console.warn(`[hexle] Prefetch of ${dateKey} ${puzzle.id} failed:`, err);
      }
    }
  }
}

let upcomingStarted = false;
export function startUpcomingPrefetch({ days = 7, delayMs = 4000 } = {}) {
  if (upcomingStarted || typeof window === "undefined") return;
  upcomingStarted = true;
  const run = () =>
    navigator.locks?.request
      ? navigator.locks.request("hexle-upcoming-prefetch", () => prefetchUpcoming(days))
      : prefetchUpcoming(days);
  setTimeout(() => {
    Promise.resolve()
      .then(run)
      .catch((err) => console.warn("[hexle] Upcoming prefetch failed:", err));
  }, delayMs);
}

/* ─────────────────────────── progress state ─────────────────────────── */
// { date, times: [ms × 5], solutions: [selections | null × 5], draft: { index, selections } | null }

export function emptyDailyState(dateKey) {
  return {
    date: dateKey,
    times: Array(DAILY_COUNT).fill(0),
    solutions: Array(DAILY_COUNT).fill(null),
    draft: null,
  };
}

export function loadDailyState(dateKey) {
  const stored = readJSON(STATE_KEY, null);
  if (!stored || stored.date !== dateKey) return emptyDailyState(dateKey);
  return { ...emptyDailyState(dateKey), ...stored };
}

export function saveDailyState(state) {
  writeJSON(STATE_KEY, state);
}

export const totalTime = (times) => times.reduce((sum, t) => sum + (t || 0), 0);
export const isDailyDone = (state) => state.solutions.every(Boolean);
/** Index of the first unsolved puzzle, or -1 when the gauntlet is finished. */
export const currentDailyIndex = (state) => state.solutions.findIndex((s) => !s);
export const hasStartedDaily = (state) =>
  totalTime(state.times) > 0 || state.solutions.some(Boolean);

/* ─────────────────────────── history & stats ─────────────────────────── */
// { [dateKey]: { total, times: [ms × 5] } } for completed days only.

export function loadHistory() {
  return readJSON(HISTORY_KEY, {});
}

/** Record a finished gauntlet. Idempotent: the first recorded result for a day wins. */
export function recordCompletion(dateKey, times) {
  const history = loadHistory();
  if (!history[dateKey]) {
    history[dateKey] = { total: totalTime(times), times: [...times] };
    writeJSON(HISTORY_KEY, history);
  }
  return history;
}

const average = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const minimum = (arr) => (arr.length ? Math.min(...arr) : null);

export function getHexleStats(todayKey) {
  const history = loadHistory();
  const dates = Object.keys(history).filter(
    (k) => /^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isFinite(history[k]?.total)
  );
  const days = new Set(dates.map(dayIndex));
  const today = dayIndex(todayKey);

  // Like Wordle, a streak stays alive until a full day is missed.
  let currentStreak = 0;
  const streakEnd = days.has(today) ? today : today - 1;
  while (days.has(streakEnd - currentStreak)) currentStreak++;

  let maxStreak = 0;
  let run = 0;
  let prev = null;
  [...days].sort((a, b) => a - b).forEach((d) => {
    run = prev !== null && d === prev + 1 ? run + 1 : 1;
    maxStreak = Math.max(maxStreak, run);
    prev = d;
  });

  const entries = dates.map((k) => history[k]);
  const prevEntries = dates.filter((k) => k !== todayKey).map((k) => history[k]);
  const perPuzzle = (list, i) => list.map((e) => e.times?.[i]).filter(Number.isFinite);

  const totals = entries.map((e) => e.total);
  const prevTotals = prevEntries.map((e) => e.total);
  const todayEntry = history[todayKey] ?? null;

  return {
    played: dates.length,
    currentStreak,
    maxStreak,
    avgTotal: average(totals),
    bestTotal: minimum(totals),
    avgPerPuzzle: DAILY_PUZZLE_IDS.map((_, i) => average(perPuzzle(entries, i))),
    bestPerPuzzle: DAILY_PUZZLE_IDS.map((_, i) => minimum(perPuzzle(entries, i))),
    // Averages *before* today, for the "vs your average" comparison.
    prevAvgPerPuzzle: DAILY_PUZZLE_IDS.map((_, i) => average(perPuzzle(prevEntries, i))),
    isPersonalBest: !!todayEntry && prevTotals.length > 0 && todayEntry.total < Math.min(...prevTotals),
  };
}

/* ─────────────────────────── sharing ─────────────────────────── */

const DIFFICULTY_EMOJI = {
  easy: "🟩",
  intermediate: "🟨",
  medium: "🟧",
  hard: "🟥",
  extreme: "🟪",
};

export function buildShareText(dateKey, times, url) {
  const lines = [`Hexle #${getHexleNumber(dateKey)} ⏱️ ${formatTime(totalTime(times))}`];
  DAILY_PUZZLES.forEach((p, i) => {
    lines.push(`${DIFFICULTY_EMOJI[p.difficulty] ?? "⬜"} ${formatTime(times[i])}`);
  });
  if (url) lines.push(url);
  return lines.join("\n");
}

/* ─────────────────────────── account sync helpers ─────────────────────────── */
// Everything the account stores about the Hexle: completed-day history + today's progress.

export const HEXLE_STORAGE_KEYS = [HISTORY_KEY, STATE_KEY];

const isDateKey = (k) => /^\d{4}-\d{2}-\d{2}$/.test(k);

function cleanHistory(history) {
  const out = {};
  if (!history || typeof history !== "object") return out;
  Object.entries(history).forEach(([date, entry]) => {
    if (isDateKey(date) && Number.isFinite(entry?.total) && Array.isArray(entry.times)) {
      out[date] = { total: entry.total, times: entry.times.slice(0, DAILY_COUNT) };
    }
  });
  return out;
}

function cleanDaily(daily) {
  if (!daily || !isDateKey(daily.date) || !Array.isArray(daily.times) || !Array.isArray(daily.solutions)) {
    return null;
  }
  return { ...emptyDailyState(daily.date), ...daily };
}

/** Union of two histories; `primary` wins if both have the same day. */
export function mergeHexleHistory(primary, secondary) {
  return { ...cleanHistory(secondary), ...cleanHistory(primary) };
}

/** The progress worth keeping: the newer day, else more puzzles solved, else more time played. */
export function pickHexleDaily(a, b) {
  const x = cleanDaily(a);
  const y = cleanDaily(b);
  if (!x || !y) return x || y;
  if (x.date !== y.date) return x.date > y.date ? x : y;
  const solved = (s) => s.solutions.filter(Boolean).length;
  if (solved(x) !== solved(y)) return solved(x) > solved(y) ? x : y;
  return totalTime(x.times) >= totalTime(y.times) ? x : y;
}

export function readLocalHexle() {
  return { history: loadHistory(), daily: readJSON(STATE_KEY, null) };
}

export function writeLocalHexle({ history, daily }) {
  if (history) writeJSON(HISTORY_KEY, history);
  if (daily) writeJSON(STATE_KEY, daily);
}
