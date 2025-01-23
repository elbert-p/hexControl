// app/puzzle/[id]/page.js
"use client";

import React from "react";
import { useParams } from "next/navigation";
import puzzles from "../../puzzleData"; // Adjusted import path
import HexPuzzleWrapper from "../../../components/HexPuzzleWrapper"; // Adjust path as necessary

export default function PuzzlePage() {
  const params = useParams();
  const puzzleId = params.id;

  // Find the puzzle with this ID
  const puzzle = puzzles.find((p) => p.id === puzzleId);

  if (!puzzle) {
    return <div>No puzzle found with ID: {puzzleId}</div>;
  }
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "#c6e2e9", // Same background as puzzle-select page
        display: "flex",
        justifyContent: "center",
      }}
    >
      <HexPuzzleWrapper
        mapData={puzzle.mapData}
        colorToWin={puzzle.colorToWin}
        regionSize={puzzle.regionSize}
        puzzleId={puzzle.id}
        sizeMultiplier={puzzle.sizeMultiplier}
      />
    </div>
  );
}
