// src/workers/puzzleWorker.js
import makeHardPuzzle from "/Users/philipelbert/hexcontrol/src/app/makePuzzle.js";
import solvePuzzle from "/Users/philipelbert/hexcontrol/src/app/solvePuzzle.js";

self.onmessage = async (event) => {
  const {
    puzzleIndex,
    baseData,           // the minimal shape or partial map
    colorToWin,
    regionSize,
    maxSolutions,
    maxAttempts,
    difficultyThreshold
  } = event.data;

  try {
    // Generate the puzzle in the background
    const puzzleMap = makeHardPuzzle(
      baseData,
      colorToWin,
      regionSize,
      maxSolutions,
      maxAttempts,
      difficultyThreshold
    );

    // Send back the result
    console.log(JSON.stringify(puzzleMap).replace(/"/g, ''))
    postMessage({
      success: true,
      puzzleIndex,
      puzzleMap
    });
  } catch (err) {
    postMessage({
      success: false,
      puzzleIndex,
      error: err?.message || String(err)
    });
  }
};
