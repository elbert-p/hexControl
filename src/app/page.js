//page.js (in src/app)
"use client";
import React, { useState, useEffect } from "react";
import HexPuzzleWrapper from "../components/HexPuzzleWrapper";
import { GridGenerator } from "react-hexgrid";

export default function HomePage() {
  // Example puzzle data
  const puzzleData = [
    { q: 0, r: 0, s: 0, color: 1 },   // 1 => #eee
    { q: 1, r: 0, s: -1, color: 1 },  // 0 => #88f
    { q: 0, r: 1, s: -1, color: 0 },
    { q: -1, r: 1, s: 0, color: 0 },
    { q: -1, r: 0, s: 1, color: 0 },
    { q: 0, r: -1, s: 1, color: 1 },
    { q: 1, r: -1, s: 0, color: 0 },
    // // { q: 1, r: -2, s: 1, color: 1 },
    { q: 1, r: 1, s: -2, color: 0 },
    { q: -2, r: 1, s: 1, color: 1 },
  ];

  const puzzleData2 = GridGenerator.rectangle(7, 5).map((hex, idx) => ({
    q: hex.q,
    r: hex.r,
    s: hex.s,
    color: idx % 2, // alternate color 0/1
  }));
  
  // const puzzleData3 = GridGenerator.rectangle(5, 4).map((hex, idx) => ({
  //   q: hex.q,
  //   r: hex.r,
  //   s: hex.s,
  //   color: Math.random() > 0.6 ? 1 : 0, // random color 0/1
  // }));
//      puzzleData={puzzleData3}

  return (
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: "center", height: "100vh", backgroundColor: "#c6e2e9",
    }}>
      <HexPuzzleWrapper
        puzzleData={puzzleData}
        colorToWin={1}
        regionSize={3}
      />
    </main>
  );
}
