// src/puzzleData.js
import { GridGenerator } from "react-hexgrid";
import generateMapData from "./generateMapData";
import makeHardPuzzle from "./makePuzzle";
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
          mapData: [
                { q: -2, r: 0, s: 2, color: 1 },
                { q: -1, r: 0, s: 1, color: 1 },
                { q: 0, r: 0, s: 0, color: 0 },
                { q: 1, r: 0, s: -1, color: 0 },
                { q: 2, r: 0, s: -2, color: 1 },
          ],
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
        difficulty: "medium",
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
        mapData: [{q:0,r:0,s:0,color:0},{q:0,r:1,s:-1,color:0},{q:-1,r:0,s:1,color:0},{q:0,r:-1,s:1,color:1},{q:1,r:-1,s:0,color:1},{q:-1,r:-1,s:2,color:0},{q:2,r:-2,s:0,color:1},{q:1,r:-2,s:1,color:1},{q:-1,r:1,s:0,color:1},{q:1,r:0,s:-1,color:0},{q:0,r:2,s:-2,color:1},{q:3,r:-2,s:-1,color:0},{q:3,r:-1,s:-2,color:0},{q:3,r:-3,s:0,color:0},{q:2,r:-1,s:-1,color:1},{q:2,r:0,s:-2,color:1},{q:-2,r:-1,s:3,color:1},{q:0,r:-2,s:2,color:0}],
        colorToWin: 1,
        regionSize: 6,
      },
      {
        id: "5a",
        q: 4,
        r: 0,
        s: -4,
        difficulty: "medium",
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
        difficulty: "easy",
        mapData: makeHardPuzzle(generateMapData(18, 0.2, 0.5, 0.5), 1, 6, 5),
          colorToWin: 1,
          regionSize: 6,
      },
      {
        id: "4a",
        q: 1,
        r: 1,
        s: -2,
        difficulty: "easy",
        mapData: makeHardPuzzle(generateMapData(18, 0.2, 0.5, 0.5), 1, 6, 5),
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
        mapData: [{q:0,r:0,s:0,color:0},{q:1,r:-1,s:0,color:0},{q:-1,r:0,s:1,color:0},{q:0,r:-1,s:1,color:1},{q:2,r:-2,s:0,color:1},{q:2,r:-1,s:-1,color:1},{q:1,r:0,s:-1,color:1},{q:1,r:-2,s:1,color:0},{q:2,r:0,s:-2,color:0},{q:1,r:1,s:-2,color:0},{q:0,r:1,s:-1,color:1},{q:-1,r:1,s:0,color:1},{q:-2,r:1,s:1,color:1},{q:-2,r:0,s:2,color:0},{q:-1,r:-1,s:2,color:1},{q:0,r:2,s:-2,color:0},{q:-3,r:1,s:2,color:0},{q:-2,r:-1,s:3,color:0}],
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
    // Add more puzzles as needed
  ];
  console.log(JSON.stringify(puzzles.find((p) => p.id === "4").mapData).replace(/"/g, ''));
  export default puzzles;


/*
possible 4
[{q:0,r:0,s:0,color:0},{q:1,r:0,s:-1,color:0},{q:0,r:1,s:-1,color:0},{q:-1,r:1,s:0,color:1},{q:-1,r:0,s:1,color:0},{q:0,r:-1,s:1,color:1},{q:1,r:-2,s:1,color:0},{q:1,r:-1,s:0,color:1},{q:-1,r:-1,s:2,color:0},{q:0,r:-2,s:2,color:1},{q:2,r:-2,s:0,color:0},{q:2,r:-1,s:-1,color:0},{q:2,r:0,s:-2,color:1},{q:-1,r:2,s:-1,color:1},{q:-2,r:2,s:0,color:0},{q:-2,r:1,s:1,color:1},{q:1,r:-3,s:2,color:1},{q:-1,r:-2,s:3,color:1},{q:0,r:-3,s:3,color:0},{q:3,r:-2,s:-1,color:1},{q:3,r:-1,s:-2,color:0},{q:1,r:1,s:-2,color:0},{q:0,r:2,s:-2,color:1},{q:1,r:2,s:-3,color:0},{q:-1,r:3,s:-2,color:0},{q:-2,r:0,s:2,color:0},{q:-2,r:-1,s:3,color:0},{q:0,r:3,s:-3,color:0},{q:-1,r:4,s:-3,color:1},{q:-2,r:4,s:-2,color:0},{q:-2,r:3,s:-1,color:0},{q:-2,r:5,s:-3,color:0},{q:-3,r:5,s:-2,color:0},{q:-3,r:4,s:-1,color:1},{q:4,r:-3,s:-1,color:1},{q:4,r:-2,s:-2,color:0},{q:3,r:-3,s:0,color:0},{q:1,r:3,s:-4,color:1},{q:0,r:4,s:-4,color:1},{q:2,r:-4,s:2,color:0},{q:2,r:-3,s:1,color:0},{q:1,r:-4,s:3,color:0}]
*/
/*6 region size, 3a
[{q:0,r:0,s:0,color:0},{q:1,r:-1,s:0,color:0},{q:-1,r:0,s:1,color:0},{q:0,r:-1,s:1,color:1},{q:2,r:-2,s:0,color:1},{q:2,r:-1,s:-1,color:1},{q:1,r:0,s:-1,color:1},{q:1,r:-2,s:1,color:0},{q:2,r:0,s:-2,color:0},{q:1,r:1,s:-2,color:0},{q:0,r:1,s:-1,color:1},{q:-1,r:1,s:0,color:1},{q:-2,r:1,s:1,color:1},{q:-2,r:0,s:2,color:0},{q:-1,r:-1,s:2,color:1},{q:0,r:2,s:-2,color:0},{q:-3,r:1,s:2,color:0},{q:-2,r:-1,s:3,color:0}]
*/