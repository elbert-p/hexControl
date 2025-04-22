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
    // const baseData = [{q:1,r:-3,s:2,color:0},{q:2,r:-3,s:1,color:0},{q:0,r:-2,s:2,color:1},{q:1,r:-2,s:1,color:0},{q:2,r:-2,s:0,color:0},{q:-1,r:-1,s:2,color:1},{q:0,r:-1,s:1,color:0},{q:1,r:-1,s:0,color:1},{q:2,r:-1,s:-1,color:1},{q:-2,r:0,s:2,color:0},{q:-1,r:0,s:1,color:0},{q:1,r:0,s:-1,color:1},{q:2,r:0,s:-2,color:1},{q:-3,r:1,s:2,color:1},{q:-2,r:1,s:1,color:1},{q:-1,r:1,s:0,color:0},{q:0,r:1,s:-1,color:0},{q:1,r:1,s:-2,color:0},{q:2,r:1,s:-3,color:0},{q:-4,r:2,s:2,color:0},{q:-3,r:2,s:1,color:0},{q:-2,r:2,s:0,color:1},{q:-1,r:2,s:-1,color:1},{q:0,r:2,s:-2,color:1},{q:1,r:2,s:-3,color:0},{q:2,r:2,s:-4,color:0},{q:-5,r:3,s:2,color:0},{q:-4,r:3,s:1,color:0},{q:-2,r:3,s:-1,color:0},{q:-1,r:3,s:-2,color:0},{q:1,r:3,s:-4,color:0},{q:2,r:3,s:-5,color:0},{q:-6,r:4,s:2,color:0},{q:-5,r:4,s:1,color:0},{q:-4,r:4,s:0,color:1},{q:-3,r:4,s:-1,color:1},{q:-2,r:4,s:-2,color:0},{q:-1,r:4,s:-3,color:0},{q:0,r:4,s:-4,color:0},{q:1,r:4,s:-5,color:1},{q:2,r:4,s:-6,color:0},{q:-6,r:5,s:1,color:0},{q:-5,r:5,s:0,color:0},{q:-4,r:5,s:-1,color:1},{q:-3,r:5,s:-2,color:1},{q:-2,r:5,s:-3,color:0},{q:-1,r:5,s:-4,color:0},{q:0,r:5,s:-5,color:1},{q:1,r:5,s:-6,color:0}]
    // const baseData = [{q:0,r:-2,s:2,color:0},{q:2,r:-2,s:0,color:0},{q:-2,r:-1,s:3,color:0},{q:-1,r:-1,s:2,color:1},{q:0,r:-1,s:1,color:0},{q:1,r:-1,s:0,color:1},{q:2,r:-1,s:-1,color:1},{q:3,r:-1,s:-2,color:0},{q:-2,r:0,s:2,color:0},{q:-1,r:0,s:1,color:1},{q:1,r:0,s:-1,color:1},{q:2,r:0,s:-2,color:1},{q:-3,r:1,s:2,color:1},{q:-2,r:1,s:1,color:1},{q:1,r:1,s:-2,color:0},{q:2,r:1,s:-3,color:0},{q:-3,r:2,s:1,color:0},{q:-2,r:2,s:0,color:1},{q:-1,r:2,s:-1,color:1},{q:0,r:2,s:-2,color:1},{q:1,r:2,s:-3,color:0},{q:-3,r:3,s:0,color:0},{q:-2,r:3,s:-1,color:0},{q:-1,r:3,s:-2,color:0},{q:0,r:3,s:-3,color:0},{q:-5,r:4,s:1,color:0},{q:-4,r:4,s:0,color:0},{q:-3,r:4,s:-1,color:0},{q:-2,r:4,s:-2,color:0},{q:-1,r:4,s:-3,color:0},{q:0,r:4,s:-4,color:0},{q:1,r:4,s:-5,color:1},{q:-5,r:5,s:0,color:0},{q:-4,r:5,s:-1,color:1},{q:-1,r:5,s:-4,color:0},{q:0,r:5,s:-5,color:0},{q:-5,r:6,s:-1,color:0},{q:-4,r:6,s:-2,color:0},{q:-2,r:6,s:-4,color:1},{q:-1,r:6,s:-5,color:1},{q:-6,r:7,s:-1,color:0},{q:-5,r:7,s:-2,color:0},{q:-4,r:7,s:-3,color:0},{q:-3,r:7,s:-4,color:0},{q:-2,r:7,s:-5,color:0},{q:-1,r:7,s:-6,color:1},{q:-5,r:8,s:-3,color:1},{q:-4,r:8,s:-4,color:0},{q:-3,r:8,s:-5,color:0}]
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
