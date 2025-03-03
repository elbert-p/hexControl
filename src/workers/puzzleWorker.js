// src/workers/puzzleWorker.js
import makeHardPuzzle from "../app/makePuzzle.js";
import generateMapData from "../app/generateMapData.js";

self.onmessage = async (event) => {
  const {
    puzzleIndex,
    cellCount,
    spreadFactor,
    directionBias,
    colorRatio,
    // baseData,
    colorToWin,
    regionSize,
    maxSolutions,
    maxAttempts,
    difficultyThreshold
  } = event.data;

  try {
    const baseData = generateMapData(cellCount, spreadFactor, directionBias, colorRatio);
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
