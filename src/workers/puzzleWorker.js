// src/workers/puzzleWorker.js
import makeHardPuzzle from "../app/makePuzzle.js";
import generateMapData from "../app/generateMapData.js";
import solvePuzzle from "../app/solvePuzzle.js";
import { makeRng } from "../app/seededRandom.js";

// With a seed, retry with deterministic derived seeds so every player still lands on
// the exact same puzzle even if the first attempt can't meet the difficulty criteria.
const MAX_SEEDED_ATTEMPTS = 20;

const cellKey = (h) => `${h.q},${h.r},${h.s}`;

self.onmessage = async (event) => {
  const {
    mode = "generate",
    puzzleIndex,
    cellCount,
    spreadFactor,
    directionBias,
    colorRatio,
    colorToWin,
    regionSize,
    maxSolutions,
    maxAttempts,
    difficultyThreshold,
    seed,
    map,
    attempt,
  } = event.data;

  // ── Verify a map someone else generated (e.g. downloaded from Supabase) ──
  // Its shape must match the seeded base map for that attempt, and it must be a
  // valid puzzle (between 1 and maxSolutions solutions).
  if (mode === "verify") {
    try {
      const base = generateMapData(
        cellCount, spreadFactor, directionBias, colorRatio, makeRng(`${seed}#${attempt}`)
      );
      const shapeOk =
        Array.isArray(map) &&
        map.length === base.length &&
        base.every((h, i) => cellKey(h) === cellKey(map[i])) &&
        map.every((h) => h.color === 0 || h.color === 1);
      const solutions = shapeOk ? solvePuzzle(map, colorToWin, regionSize, maxSolutions + 1).length : 0;
      postMessage({ success: true, valid: shapeOk && solutions >= 1 && solutions <= maxSolutions });
    } catch (err) {
      postMessage({ success: true, valid: false, error: err?.message || String(err) });
    }
    return;
  }

  const generate = (rng) => {
    const baseData = generateMapData(cellCount, spreadFactor, directionBias, colorRatio, rng);
    return makeHardPuzzle(
      baseData,
      colorToWin,
      regionSize,
      maxSolutions,
      maxAttempts,
      difficultyThreshold,
      rng
    );
  };

  try {
    let puzzleMap;
    let usedAttempt = null;
    if (seed == null) {
      puzzleMap = generate(Math.random);
    } else {
      let lastError;
      for (let a = 0; a < MAX_SEEDED_ATTEMPTS && !puzzleMap; a++) {
        try {
          puzzleMap = generate(makeRng(`${seed}#${a}`));
          usedAttempt = a;
        } catch (err) {
          lastError = err;
        }
      }
      if (!puzzleMap) throw lastError;
    }

    console.log(JSON.stringify(puzzleMap).replace(/"/g, ''))
    postMessage({
      success: true,
      puzzleIndex,
      puzzleMap,
      attempt: usedAttempt,
    });
  } catch (err) {
    postMessage({
      success: false,
      puzzleIndex,
      error: err?.message || String(err)
    });
  }
};
