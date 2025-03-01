// src/puzzleData.js
import { GridGenerator } from "react-hexgrid";
import generateMapData from "./generateMapData";
import makeHardPuzzle from "./makePuzzle";
import hardPuzzleGeneratorGA from './hardPuzzleGA.js';

const puzzle2acolors = 
    [1, 0, 0, 0, 1, 1, 1, 0, 0, 0,
    0, 0, 0, 0, 0, 1, 1, 1, 1, 1,
    0, 0, 0, 0, 0, 1, 1, 0, 1, 0,
    0, 1, 0, 0, 0, 1, 1, 0, 0, 1,
    1, 0, 0, 0, 0, 0, 0, 0, 1, 0,]
    const puzzle0colors = 
    [0, 0, 1, 0,
      1, 1, 0, 0,
      1, 1, 0, 1]
const puzzle5colors = 
    [0, 0, 0, 0, 0, 1, 1, 
    0, 1, 0, 0, 0, 0, 0, 
    1, 0, 0, 1, 0, 0, 1, 
    0, 1, 0, 0, 1, 0, 1,
    1, 0, 0, 1, 0, 1, 0]
// const result = hardPuzzleGeneratorGA({
//   cellCount: 35,
//   regionSize: 7,
//   colorToWin: 1,
//   maxSolutions: 5,
//   difficultyThreshold: 3,
//   populationSize: 20,
//   maxGenerations: 10,
//   mutationRate: 0.1,
// });
// if (result) {
//   console.log("Found a puzzle after", result.generation, "generations");
//   console.log("Edges/hex:", result.edgesPerHex, "Solutions:", result.solutionCount);
//   console.log(result.mapData);  // the final layout with color bits from the GA
// } else {
//   console.log("No suitable puzzle found in time.");
// }
const puzzles = [
    {
        id: "0",
        q: 0,
        r: 0,
        s: 0,
        difficulty: "easy",
        // mapData: //version for tutorial
        // [...GridGenerator.rectangle(4, 3).map((hex, idx) => {
        //         return {
        //           q: hex.q,
        //           r: hex.r,
        //           s: hex.s,
        //           color: puzzle0colors[idx],
        //         };
        //       }), { q: -1, r: 3, s: -2, color: 0 }, { q: 0, r: 3, s: -3, color: 0 }, { q: 1, r: 3, s: -4, color: 0 }],
        // mapData: [ // straight line
        //       { q: -2, r: 0, s: 2, color: 1 },
        //       { q: -1, r: 0, s: 1, color: 1 },
        //       { q: 0, r: 0, s: 0, color: 0 },
        //       { q: 1, r: 0, s: -1, color: 0 },
        //       { q: 2, r: 0, s: -2, color: 1 },
        // ],
        mapData: [...GridGenerator.hexagon(1, 1).map((hex) => {
          return {
            q: hex.q,
            r: hex.r,
            s: hex.s,
            color: 0,
          };
        }), { q: 1, r: 1, s: -2, color: 1 }, { q: 2, r: -1, s: -1, color: 1 }, { q: -1, r: 2, s: -1, color: 1 }, 
            { q: -1, r: -1, s: 2, color: 1 }, { q: -2, r: 1, s: 1, color: 1 }, { q: 1, r: -2, s: 1, color: 1 },
            { q: 2, r: -2, s: 0, color: 0 }, { q: -2, r: 2, s: 0, color: 0 }],
        colorToWin: 1,
        regionSize: 5,
    },
    {
        id: "1",
        q: 1,
        r: -1,
        s: 0,
        difficulty: "easy",
        mapData: [
          { q: 0, r: 0, s: 0, color: 1 },
          { q: 1, r: 0, s: -1, color: 0 },
          { q: 0, r: 1, s: -1, color: 0 },
          { q: -1, r: 1, s: 0, color: 0 },
          { q: -1, r: 0, s: 1, color: 1 },
          { q: 0, r: -1, s: 1, color: 0 },
          { q: 1, r: -1, s: 0, color: 1 },
          { q: 1, r: 1, s: -2, color: 1 },
          { q: -2, r: 1, s: 1, color: 0 },
        ],
        colorToWin: 1,
        regionSize: 3,
    },
    {
        id: "2",
        q: 2,
        r: -1,
        s: -1,
        difficulty: "easy",
        mapData: [
            {q:0, r:0, s:0, color:0},
            {q:-1, r:1, s:0, color:0},
            {q:0, r:-1, s:1, color:1},
            {q:1, r:-1, s:0, color:0},
            {q:1, r:0, s:-1, color:1},
            {q:0, r:1, s:-1, color:0},
            {q:1, r:-2, s:1, color:0},
            {q:2, r:-2, s:0, color:1},
            {q:2, r:-1, s:-1, color:1},
            {q:2, r:0, s:-2, color:0},
            {q:1, r:1, s:-2, color:0},
            {q:3, r:-1, s:-2, color:0},
            {q:3, r:0, s:-3, color:1},
            {q:2, r:1, s:-3, color:0},
            {q:1, r:2, s:-3, color:1}
          ],
        colorToWin: 1,
        regionSize: 5,
    },
    {
        id: "2a",
        q: 3,
        r: -2,
        s: -1,
        difficulty: "intermediate",
        mapData: GridGenerator.rectangle(10, 5).map((hex, idx) => {
            // if (hex.r % 2 !== 0) {
            //   hex.q -= 1; // Shift odd rows to the left
            //   hex.s += 1;
            // }
            return {
              q: hex.q,
              r: hex.r,
              s: hex.s,
              color: puzzle2acolors[idx],
            };
          }),
        colorToWin: 1,
        regionSize: 10,
      },
    //   {
    //     id: "2b",
    //     q: 4,
    //     r: -3,
    //     s: -1,
    //     difficulty: "hard",
    //     mapData: makeHardPuzzle(generateMapData(10, 0.55, 0.35, 0.4), 1, 10, 5),
    //     colorToWin: 1,
    //     regionSize: 10,
    //   },
      {
        id: "3",
        q: 3,
        r: -1,
        s: -2,
        difficulty: "easy",
        mapData: [{q:0,r:0,s:0,color:0},{q:1,r:-1,s:0,color:0},{q:-1,r:0,s:1,color:0},{q:0,r:-1,s:1,color:1},{q:2,r:-2,s:0,color:1},{q:2,r:-1,s:-1,color:1},{q:1,r:0,s:-1,color:1},{q:1,r:-2,s:1,color:0},{q:2,r:0,s:-2,color:0},{q:1,r:1,s:-2,color:0},{q:0,r:1,s:-1,color:1},{q:-1,r:1,s:0,color:1},{q:-2,r:1,s:1,color:1},{q:-2,r:0,s:2,color:0},{q:-1,r:-1,s:2,color:1},{q:0,r:2,s:-2,color:0},{q:-3,r:1,s:2,color:0},{q:-2,r:-1,s:3,color:0}],
        colorToWin: 1,
        regionSize: 6,
      },
      {
        id: "5a",
        q: 4,
        r: 0,
        s: -4,
        difficulty: "intermediate",
        mapData: 
        // makeHardPuzzle(GridGenerator.rectangle(7, 5).map((hex, idx) => ({
        //     q: hex.q,
        //     r: hex.r,
        //     s: hex.s,
        //     color: puzzle5colors[idx]
        //   })), 1, 5, 5),

        [{q: -0, r: 0, s: 0, color: 0},
        {q: 1, r: 0, s: -1, color: 0},
        {q: 2, r: 0, s: -2, color: 1},
        {q: 3, r: 0, s: -3, color: 0},
        {q: 4, r: 0, s: -4, color: 0},
        {q: 5, r: 0, s: -5, color: 1},
        {q: 6, r: 0, s: -6, color: 1},
        {q: -0, r: 1, s: -1, color: 1},
        {q: 1, r: 1, s: -2, color: 0},
        {q: 2, r: 1, s: -3, color: 1},
        {q: 3, r: 1, s: -4, color: 0},
        {q: 4, r: 1, s: -5, color: 0},
        {q: 5, r: 1, s: -6, color: 0},
        {q: 6, r: 1, s: -7, color: 0},
        {q: -1, r: 2, s: -1, color: 0},
        {q: 0, r: 2, s: -2, color: 0},
        {q: 1, r: 2, s: -3, color: 0},
        {q: 2, r: 2, s: -4, color: 1},
        {q: 3, r: 2, s: -5, color: 0},
        {q: 4, r: 2, s: -6, color: 0},
        {q: 5, r: 2, s: -7, color: 0},
        {q: -1, r: 3, s: -2, color: 0},
        {q: 0, r: 3, s: -3, color: 1},
        {q: 1, r: 3, s: -4, color: 0},
        {q: 2, r: 3, s: -5, color: 0},
        {q: 3, r: 3, s: -6, color: 1},
        {q: 4, r: 3, s: -7, color: 0},
        {q: 5, r: 3, s: -8, color: 1},
        {q: -2, r: 4, s: -2, color: 1},
        {q: -1, r: 4, s: -3, color: 0},
        {q: 0, r: 4, s: -4, color: 0},
        {q: 1, r: 4, s: -5, color: 1},
        {q: 2, r: 4, s: -6, color: 0},
        {q: 3, r: 4, s: -7, color: 1},
        {q: 4, r: 4, s: -8, color: 0}],
        colorToWin: 1,
        regionSize: 5,
      },
      {
        id: "4",
        q: 2,
        r: 0,
        s: -2,
        difficulty: "intermediate",
        mapData: [{q:0,r:0,s:0,color:0},{q:0,r:1,s:-1,color:0},{q:-1,r:0,s:1,color:0},{q:0,r:-1,s:1,color:1},{q:1,r:-1,s:0,color:1},{q:-1,r:-1,s:2,color:0},{q:2,r:-2,s:0,color:1},{q:1,r:-2,s:1,color:1},{q:-1,r:1,s:0,color:1},{q:1,r:0,s:-1,color:0},{q:0,r:2,s:-2,color:1},{q:3,r:-2,s:-1,color:0},{q:3,r:-1,s:-2,color:0},{q:3,r:-3,s:0,color:0},{q:2,r:-1,s:-1,color:1},{q:2,r:0,s:-2,color:1},{q:-2,r:-1,s:3,color:1},{q:0,r:-2,s:2,color:0}],
        colorToWin: 1,
        regionSize: 6,
      },
      {
        id: "4a",
        q: 1,
        r: 1,
        s: -2,
        difficulty: "medium",
        mapData: [{q:0,r:0,s:0,color:1},{q:1,r:-1,s:0,color:1},{q:1,r:0,s:-1,color:1},{q:-1,r:1,s:0,color:0},{q:-1,r:0,s:1,color:0},{q:0,r:-1,s:1,color:0},{q:0,r:1,s:-1,color:1},{q:-1,r:2,s:-1,color:0},{q:-2,r:2,s:0,color:1},{q:-2,r:1,s:1,color:0},{q:2,r:-1,s:-1,color:1},{q:2,r:0,s:-2,color:0},{q:1,r:1,s:-2,color:1},{q:-3,r:2,s:1,color:1},{q:-2,r:0,s:2,color:0},{q:-1,r:-1,s:2,color:0},{q:3,r:-2,s:-1,color:1},{q:2,r:-2,s:0,color:1},{q:3,r:0,s:-3,color:0},{q:4,r:0,s:-4,color:0},{q:3,r:1,s:-4,color:1},{q:2,r:1,s:-3,color:0},{q:3,r:-1,s:-2,color:1},{q:4,r:-3,s:-1,color:0},{q:4,r:-2,s:-2,color:0},{q:3,r:-3,s:0,color:1},{q:-2,r:3,s:-1,color:0},{q:-3,r:3,s:0,color:0},{q:-2,r:-1,s:3,color:0},{q:-1,r:-2,s:3,color:1}],
        colorToWin: 1,
        regionSize: 6,
      },
      {
        id: "5",
        q: 3,
        r: 0,
        s: -3,
        difficulty: "medium",
        mapData: GridGenerator.rectangle(7, 5).map((hex, idx) => ({
            q: hex.q,
            r: hex.r,
            s: hex.s,
            color: puzzle5colors[idx]
          })),
        colorToWin: 1,
        regionSize: 5,
      },
      {
        id: "3a",
        q: 4,
        r: -2,
        s: -2,
        difficulty: "easy",
        mapData: [
          {q: -1, r: -2, s:  3, color: 1},
          {q:  1, r: -2, s:  1, color: 1},
          {q: -2, r: -1, s:  3, color: 1}, // blue
          {q: -1, r: -1, s:  2, color: 0}, // red
          {q:  0, r: -1, s:  1, color: 1}, // blue
          {q:  1, r: -1, s:  0, color: 0}, // red
          {q:  2, r: -1, s: -1, color: 0}, // red
          {q: -3, r:  0, s:  3, color: 0}, // red
          {q: -2, r:  0, s:  2, color: 0}, // red
          {q: -1, r:  0, s:  1, color: 0}, // red
          {q:  0, r:  0, s:  0, color: 1},
          {q:  1, r:  0, s: -1, color: 1}, // blue
          {q:  2, r:  0, s: -2, color: 0},
          {q: -2, r:  1, s:  1, color: 1}, // blue
          {q: -1, r:  1, s:  0, color: 0}, // red
          {q:  0, r:  1, s: -1, color: 0}, // red
          {q: -1, r:  2, s: -1, color: 1}, // blue
          {q:  0, r:  2, s: -2, color: 1}  // blue
        ],
        colorToWin: 1,
        regionSize: 6,
      },
      {
        id: "6",
        q: 3,
        r: 1,
        s: -4,
        difficulty: "hard",
        mapData: [
            {q: 0, r: 0, s: 0, color: 0},
            {q: 1, r: -1, s: 0, color: 1},
            {q: 1, r: 0, s: -1, color: 0},
            {q: 0, r: 1, s: -1, color: 1},
            {q: -1, r: 1, s: 0, color: 0},
            {q: -1, r: 0, s: 1, color: 0},
            {q: 0, r: -1, s: 1, color: 0},
            {q: -1, r: 2, s: -1, color: 1},
            {q: -2, r: 2, s: 0, color: 1},
            {q: -2, r: 1, s: 1, color: 0},
            {q: 0, r: 2, s: -2, color: 0},
            {q: -1, r: 3, s: -2, color: 0},
            {q: -2, r: 3, s: -1, color: 0}, 
            {q: 1, r: -2, s: 1, color: 1},
            {q: -1, r: -1, s: 2, color: 0}, 
            {q: 0, r: -2, s: 2, color: 0},
            {q: 2, r: -1, s: -1, color: 0},
            {q: -2, r: 0, s: 2, color: 0},
            {q: 2, r: 0, s: -2, color: 0},
            {q: 1, r: 1, s: -2, color: 1},
            {q: 3, r: -1, s: -2, color: 0},
            {q: 2, r: -2, s: 0, color: 0},
            {q: -3, r: 2, s: 1, color: 1},
            {q: -3, r: 1, s: 2, color: 0},
            {q: -2, r: 4, s: -2, color: 1},
            {q: -3, r: 4, s: -1, color: 0},
            {q: -3, r: 3, s: 0, color: 0},
            {q: -4, r: 2, s: 2, color: 0},
            {q: -4, r: 1, s: 3, color: 1},
            {q: -3, r: 0, s: 3, color: 1},
            {q: -4, r: 3, s: 1, color: 0},
            {q: -5, r: 3, s: 2, color: 0},
            {q: -5, r: 2, s: 3, color: 1},
            {q: -2, r: -1, s: 3, color: 0},
            {q: -1, r: -2, s: 3, color: 1}],
        colorToWin: 1,
        regionSize: 7,
      },
      // {
      //   id: "7",
      //   q: 4,
      //   r: 1,
      //   s: -5,
      //   difficulty: "medium",
      //   mapData: makeHardPuzzle(generateMapData(27, 0.2, 0.5, 0.5), 1, 9, 5),
      //   colorToWin: 1,
      //   regionSize: 9,
      // },
      {
        id: "7",
        q: 4,
        r: 1,
        s: -5,
        difficulty: "medium",
        // mapData: result.mapData,
        mapData: [{q:0,r:0,s:0,color:0},{q:1,r:-1,s:0,color:1},{q:1,r:0,s:-1,color:1},{q:-1,r:0,s:1,color:1},{q:0,r:-1,s:1,color:0},{q:2,r:-1,s:-1,color:0},{q:2,r:0,s:-2,color:0},{q:1,r:-2,s:1,color:0},{q:-1,r:1,s:0,color:0},{q:-2,r:1,s:1,color:1},{q:-2,r:0,s:2,color:0},{q:-1,r:-1,s:2,color:1},{q:-1,r:-2,s:3,color:1},{q:-3,r:0,s:3,color:0},{q:-2,r:-1,s:3,color:1},{q:-3,r:-1,s:4,color:0},{q:-2,r:2,s:0,color:0},{q:-3,r:2,s:1,color:1},{q:-3,r:1,s:2,color:0},{q:3,r:-2,s:-1,color:1},{q:3,r:-1,s:-2,color:0}],
        colorToWin: 1,
        regionSize: 7,
      },
      // {
      //   id: "8",
      //   q: 3,
      //   r: 2,
      //   s: -5,
      //   difficulty: "intermediate",
      //   // mapData: makeHardPuzzle(generateMapData(20, 0.2, 0.5, 0.5), 1, 5, 1, 50, 3.5),
      //   // mapData: makeHardPuzzle(
      //   // [{q:0,r:0,s:0,color:0},{q:1,r:-1,s:0,color:1},{q:1,r:0,s:-1,color:0},{q:0,r:1,s:-1,color:1},{q:-1,r:1,s:0,color:0},{q:-1,r:0,s:1,color:0},{q:0,r:-1,s:1,color:0},{q:-1,r:2,s:-1,color:1},{q:-2,r:2,s:0,color:1},{q:-2,r:1,s:1,color:0},{q:0,r:2,s:-2,color:0},{q:-1,r:3,s:-2,color:0},{q:-2,r:3,s:-1,color:0},{q:1,r:-2,s:1,color:1},{q:-1,r:-1,s:2,color:0},{q:0,r:-2,s:2,color:0},{q:2,r:-1,s:-1,color:0},{q:-2,r:0,s:2,color:0},{q:2,r:0,s:-2,color:0},{q:1,r:1,s:-2,color:1},{q:3,r:-1,s:-2,color:0},{q:2,r:-2,s:0,color:0},{q:-3,r:2,s:1,color:1},{q:-3,r:1,s:2,color:0},{q:-2,r:4,s:-2,color:1},{q:-3,r:4,s:-1,color:0},{q:-3,r:3,s:0,color:0},{q:-4,r:2,s:2,color:0},{q:-4,r:1,s:3,color:1},{q:-3,r:0,s:3,color:1},{q:-4,r:3,s:1,color:0},{q:-5,r:3,s:2,color:0},{q:-5,r:2,s:3,color:1},{q:-2,r:-1,s:3,color:0},{q:-1,r:-2,s:3,color:1}]
      //   // , 1, 7, 3, 10, 3.5),
      //   mapData: null,
      //   colorToWin: 1,
      //   regionSize: 5,
      //   generationSettings: {
      //     baseData: generateMapData(35, 0.2, 0.5, 0.5), // or store the parameters and do it in the worker
      //     colorToWin: 1,
      //     regionSize: 5,
      //     maxSolutions: 1,
      //     maxAttempts: 5000,
      //     difficultyThreshold: 4,
      //   },
      // },
      //generateMapData(35, 0.2, 0.5, 0.4)
      //generateMapData(35, 1, 1, 0.4)
      {
        id: "A",
        q: -1,
        r: 0,
        s: 1,
        difficulty: "easy",
        // mapData: makeHardPuzzle(generateMapData(20, 0.2, 0.5, 0.5), 1, 5, 1, 50, 3.5),
        // mapData: makeHardPuzzle(
        // [{q:0,r:0,s:0,color:0},{q:1,r:-1,s:0,color:1},{q:1,r:0,s:-1,color:0},{q:0,r:1,s:-1,color:1},{q:-1,r:1,s:0,color:0},{q:-1,r:0,s:1,color:0},{q:0,r:-1,s:1,color:0},{q:-1,r:2,s:-1,color:1},{q:-2,r:2,s:0,color:1},{q:-2,r:1,s:1,color:0},{q:0,r:2,s:-2,color:0},{q:-1,r:3,s:-2,color:0},{q:-2,r:3,s:-1,color:0},{q:1,r:-2,s:1,color:1},{q:-1,r:-1,s:2,color:0},{q:0,r:-2,s:2,color:0},{q:2,r:-1,s:-1,color:0},{q:-2,r:0,s:2,color:0},{q:2,r:0,s:-2,color:0},{q:1,r:1,s:-2,color:1},{q:3,r:-1,s:-2,color:0},{q:2,r:-2,s:0,color:0},{q:-3,r:2,s:1,color:1},{q:-3,r:1,s:2,color:0},{q:-2,r:4,s:-2,color:1},{q:-3,r:4,s:-1,color:0},{q:-3,r:3,s:0,color:0},{q:-4,r:2,s:2,color:0},{q:-4,r:1,s:3,color:1},{q:-3,r:0,s:3,color:1},{q:-4,r:3,s:1,color:0},{q:-5,r:3,s:2,color:0},{q:-5,r:2,s:3,color:1},{q:-2,r:-1,s:3,color:0},{q:-1,r:-2,s:3,color:1}]
        // , 1, 7, 3, 10, 3.5),
        mapData: null,
        colorToWin: 1,
        regionSize: 5,
        generationSettings: {
          baseData: generateMapData(15, 0.2, 0.5, 0.5),
          colorToWin: 1,
          regionSize: 5,
          maxSolutions: 1,
          maxAttempts: 5000,
          difficultyThreshold: 4,
        },
      },
      {
        id: "B",
        q: -2,
        r: 1,
        s: 1,
        difficulty: "intermediate",
        mapData: null,
        colorToWin: 1,
        regionSize: 6,
        generationSettings: {
          baseData: generateMapData(18, 0.2, 0.5, 0.5),
          colorToWin: 1,
          regionSize: 6,
          maxSolutions: 1,
          maxAttempts: 5000,
          difficultyThreshold: 4,
        },
      },
      {
        id: "C",
        q: -2,
        r: 0,
        s: 2,
        difficulty: "intermediate",
        mapData: null,
        colorToWin: 1,
        regionSize: 5,
        generationSettings: {
          baseData: generateMapData(25, 0.2, 0.5, 0.5),
          colorToWin: 1,
          regionSize: 5,
          maxSolutions: 1,
          maxAttempts: 5000,
          difficultyThreshold: 4.35,
        },
      },
      {
        id: "D",
        q: -2,
        r: -1,
        s: 3,
        difficulty: "medium",
        mapData: null,
        colorToWin: 1,
        regionSize: 5,
        generationSettings: {
          baseData: generateMapData(35, 0.2, 0.5, 0.5), 
          colorToWin: 1,
          regionSize: 5,
          maxSolutions: 1,
          maxAttempts: 5000,
          difficultyThreshold: 4,
        },
      },
      {
        id: "E",
        q: -1,
        r: -2,
        s: 3,
        difficulty: "hard",
        mapData: null,
        colorToWin: 1,
        regionSize: 7,
        generationSettings: {
          baseData: generateMapData(35, 0.2, 0.5, 0.5),
          colorToWin: 1,
          regionSize: 7,
          maxSolutions: 2,
          maxAttempts: 5000,
          difficultyThreshold: 3.5,
        },
      },
      // {
      //   id: "9",
      //   q: 2,
      //   r: 2,
      //   s: -4,
      //   difficulty: "medium",
      //   // mapData: result.mapData,
      //   mapData: hardPuzzleGeneratorGA({
      //     cellCount: 35,
      //     regionSize: 5,
      //     colorToWin: 1,
      //     maxSolutions: 2,
      //     difficultyThreshold: 3.5,
      //     populationSize: 20,
      //     maxGenerations: 10,
      //     mutationRate: 0.1}).mapData,//makeHardPuzzle(generateMapData(35, 0.2, 0.5, 0.5), 1, 5, 2, 200, 3.5),
      //   colorToWin: 1,
      //   regionSize: 5,
      // },

      // mapData: hardPuzzleGeneratorGA({
      //   cellCount: 30,
      //   regionSize: 6,
      //   colorToWin: 1,
      //   maxSolutions: 2,
      //   difficultyThreshold: 3.5,
      //   populationSize: 20,
      //   maxGenerations: 10,
      //   mutationRate: 0.1}).mapData,
    // Add more puzzles as needed
  ];
  // console.log(JSON.stringify(puzzles.find((p) => p.id === "E").mapData).replace(/"/g, ''));
  export default puzzles;


/*
possible 4
[{q:0,r:0,s:0,color:0},{q:1,r:0,s:-1,color:0},{q:0,r:1,s:-1,color:0},{q:-1,r:1,s:0,color:1},{q:-1,r:0,s:1,color:0},{q:0,r:-1,s:1,color:1},{q:1,r:-2,s:1,color:0},{q:1,r:-1,s:0,color:1},{q:-1,r:-1,s:2,color:0},{q:0,r:-2,s:2,color:1},{q:2,r:-2,s:0,color:0},{q:2,r:-1,s:-1,color:0},{q:2,r:0,s:-2,color:1},{q:-1,r:2,s:-1,color:1},{q:-2,r:2,s:0,color:0},{q:-2,r:1,s:1,color:1},{q:1,r:-3,s:2,color:1},{q:-1,r:-2,s:3,color:1},{q:0,r:-3,s:3,color:0},{q:3,r:-2,s:-1,color:1},{q:3,r:-1,s:-2,color:0},{q:1,r:1,s:-2,color:0},{q:0,r:2,s:-2,color:1},{q:1,r:2,s:-3,color:0},{q:-1,r:3,s:-2,color:0},{q:-2,r:0,s:2,color:0},{q:-2,r:-1,s:3,color:0},{q:0,r:3,s:-3,color:0},{q:-1,r:4,s:-3,color:1},{q:-2,r:4,s:-2,color:0},{q:-2,r:3,s:-1,color:0},{q:-2,r:5,s:-3,color:0},{q:-3,r:5,s:-2,color:0},{q:-3,r:4,s:-1,color:1},{q:4,r:-3,s:-1,color:1},{q:4,r:-2,s:-2,color:0},{q:3,r:-3,s:0,color:0},{q:1,r:3,s:-4,color:1},{q:0,r:4,s:-4,color:1},{q:2,r:-4,s:2,color:0},{q:2,r:-3,s:1,color:0},{q:1,r:-4,s:3,color:0}]
*/
/*6 region size, 3a
[{q:0,r:0,s:0,color:0},{q:1,r:-1,s:0,color:0},{q:-1,r:0,s:1,color:0},{q:0,r:-1,s:1,color:1},{q:2,r:-2,s:0,color:1},{q:2,r:-1,s:-1,color:1},{q:1,r:0,s:-1,color:1},{q:1,r:-2,s:1,color:0},{q:2,r:0,s:-2,color:0},{q:1,r:1,s:-2,color:0},{q:0,r:1,s:-1,color:1},{q:-1,r:1,s:0,color:1},{q:-2,r:1,s:1,color:1},{q:-2,r:0,s:2,color:0},{q:-1,r:-1,s:2,color:1},{q:0,r:2,s:-2,color:0},{q:-3,r:1,s:2,color:0},{q:-2,r:-1,s:3,color:0}]
*/

/* possible 8 35 region 5
[{"q":0,"r":0,"s":0,"color":0},{"q":1,"r":-1,"s":0,"color":1},{"q":1,"r":0,"s":-1,"color":0},{"q":0,"r":1,"s":-1,"color":0},{"q":-1,"r":1,"s":0,"color":0},{"q":-1,"r":0,"s":1,"color":1},{"q":0,"r":-1,"s":1,"color":0},{"q":-1,"r":-1,"s":2,"color":0},{"q":0,"r":-2,"s":2,"color":0},{"q":-2,"r":1,"s":1,"color":0},{"q":-2,"r":0,"s":2,"color":0},{"q":-2,"r":-1,"s":3,"color":1},{"q":-1,"r":-2,"s":3,"color":0},{"q":2,"r":-1,"s":-1,"color":0},{"q":2,"r":0,"s":-2,"color":0},{"q":3,"r":-2,"s":-1,"color":1},{"q":3,"r":-1,"s":-2,"color":0},{"q":-2,"r":2,"s":0,"color":0},{"q":-3,"r":2,"s":1,"color":1},{"q":1,"r":-2,"s":1,"color":1},{"q":1,"r":1,"s":-2,"color":1},{"q":0,"r":2,"s":-2,"color":0},{"q":-1,"r":2,"s":-1,"color":1},{"q":-2,"r":3,"s":-1,"color":0},{"q":-3,"r":3,"s":0,"color":0},{"q":-2,"r":-2,"s":4,"color":0},{"q":4,"r":-1,"s":-3,"color":1},{"q":1,"r":2,"s":-3,"color":0},{"q":0,"r":3,"s":-3,"color":1},{"q":-1,"r":3,"s":-2,"color":1},{"q":2,"r":1,"s":-3,"color":0},{"q":2,"r":2,"s":-4,"color":0},{"q":1,"r":3,"s":-4,"color":1},{"q":-2,"r":4,"s":-2,"color":0},{"q":-3,"r":1,"s":2,"color":0}]
*/

/* possible 8 nice symmetrical star, turned into 1
[{q:0,r:0,s:0,color:0},{q:1,r:-1,s:0,color:1},{q:-1,r:1,s:0,color:1},{q:-1,r:0,s:1,color:0},{q:0,r:-1,s:1,color:0},{q:1,r:-2,s:1,color:0},{q:-1,r:-1,s:2,color:0},{q:2,r:-2,s:0,color:0},{q:2,r:-1,s:-1,color:0},{q:1,r:0,s:-1,color:0},{q:3,r:-3,s:0,color:0},{q:3,r:-2,s:-1,color:0},{q:2,r:0,s:-2,color:1},{q:0,r:1,s:-1,color:0},{q:-1,r:2,s:-1,color:0},{q:-2,r:2,s:0,color:0},{q:-2,r:1,s:1,color:0},{q:3,r:-1,s:-2,color:0},{q:3,r:0,s:-3,color:0},{q:2,r:1,s:-3,color:0},{q:1,r:1,s:-2,color:0},{q:4,r:-1,s:-3,color:1},{q:3,r:1,s:-4,color:1},{q:0,r:2,s:-2,color:1},{q:4,r:-2,s:-2,color:0},{q:-3,r:3,s:0,color:1},{q:5,r:-3,s:-2,color:1},{q:4,r:-3,s:-1,color:0},{q:-1,r:3,s:-2,color:0},{q:4,r:-4,s:0,color:1},{q:2,r:-3,s:1,color:1},{q:1,r:2,s:-3,color:1},{q:-2,r:0,s:2,color:1},{q:4,r:0,s:-4,color:0},{q:4,r:1,s:-5,color:0}]
*/

/* easy puzzle, like a 2 or 3 replacement - hexes per region 6
[{q:0,r:0,s:0,color:0},{q:1,r:0,s:-1,color:0},{q:-1,r:1,s:0,color:0},{q:-1,r:0,s:1,color:0},{q:0,r:1,s:-1,color:1},{q:-2,r:1,s:1,color:1},{q:2,r:-1,s:-1,color:1},{q:2,r:0,s:-2,color:0},{q:1,r:-1,s:0,color:0},{q:3,r:-2,s:-1,color:1},{q:3,r:-1,s:-2,color:0},{q:2,r:-2,s:0,color:0},{q:0,r:-1,s:1,color:1},{q:1,r:-2,s:1,color:1},{q:3,r:-3,s:0,color:0},{q:2,r:-3,s:1,color:1},{q:3,r:-4,s:1,color:0},{q:1,r:-3,s:2,color:1}]
*/