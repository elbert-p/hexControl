// src/app/runPuzzleWorker.js
// Runs puzzle generation (or verification) in a Web Worker.
// Pass a `seed` string for deterministic output (same seed => same puzzle for everyone).

function settingsMessage(generationSettings = {}) {
  return {
    cellCount: generationSettings.cellCount ?? 25,
    spreadFactor: generationSettings.spreadFactor ?? 0.2,
    directionBias: generationSettings.directionBias ?? 0.5,
    colorRatio: generationSettings.colorRatio ?? 0.5,
    colorToWin: generationSettings.colorToWin ?? 1,
    regionSize: generationSettings.regionSize ?? 5,
    maxSolutions: generationSettings.maxSolutions ?? 5,
    maxAttempts: generationSettings.maxAttempts ?? 1000,
    difficultyThreshold: generationSettings.difficultyThreshold ?? 4,
  };
}

function runWorker(message, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const worker = new Worker(new URL("../workers/puzzleWorker.js", import.meta.url));
    const onAbort = () => {
      worker.terminate();
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    const done = () => {
      signal?.removeEventListener("abort", onAbort);
      worker.terminate();
    };

    worker.onmessage = (e) => {
      done();
      if (e.data.success) resolve(e.data);
      else reject(new Error(e.data.error));
    };
    worker.onerror = (err) => {
      done();
      reject(err);
    };
    worker.postMessage(message);
  });
}

/**
 * Generate a puzzle map. Resolves with { puzzleMap, attempt } where `attempt` is the
 * seeded retry that succeeded (null when unseeded). Pass `signal` to cancel.
 */
export default function runPuzzleWorker(generationSettings = {}, seed, { signal } = {}) {
  return runWorker({ ...settingsMessage(generationSettings), seed }, signal).then(
    ({ puzzleMap, attempt }) => ({ puzzleMap, attempt })
  );
}

/** Check (off the main thread) that `map` really is the seeded puzzle for `seed`/`attempt`. */
export function verifyPuzzleMap(generationSettings, seed, map, attempt) {
  return runWorker({ ...settingsMessage(generationSettings), mode: "verify", seed, map, attempt })
    .then(({ valid }) => !!valid)
    .catch(() => false);
}
