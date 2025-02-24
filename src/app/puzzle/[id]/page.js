// app/puzzle/[id]/page.js
"use client";

import React from "react";
import { useParams } from "next/navigation";
import puzzles from "../../puzzleData"; // Adjusted import path
import HexPuzzleWrapper from "../../../components/HexPuzzleWrapper"; // Adjust path as necessary
import PuzzleHeader  from "../../../components/PuzzleHeader"; // Added import for PuzzleHeader


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
        width: "100dvw",
        height: "100dvh",
        backgroundColor: "#c6e2e9", // Same background as puzzle-select page
        display: "flex",
        flexDirection: "column", // Stack children vertically
        alignItems: "center", // Center children horizontally
      }}
    >
      <PuzzleHeader puzzleId={puzzleId} />
  
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
