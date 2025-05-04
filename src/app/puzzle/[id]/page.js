// app/puzzle/[id]/page.js
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
// import puzzles from "../../puzzleData"; 
import { usePuzzles } from "../../../context/puzzleContext";
import HexPuzzleWrapper from "../../../components/HexPuzzleWrapper"; // Adjust path as necessary
import PuzzleHeader  from "../../../components/PuzzleHeader"; // Added import for PuzzleHeader

// Helper function to generate a unique key from cube coordinates
function hexKey(q, r, s) {
  return `${q},${r},${s}`;
}

// Helper function to get the neighbor keys for cube coordinates
function getNeighborKeys(q, r, s) {
  const directions = [
    [1, 0, -1],
    [1, -1, 0],
    [0, -1, 1],
    [-1, 0, 1],
    [-1, 1, 0],
    [0, 1, -1],
  ];
  return directions.map(([dq, dr, ds]) => hexKey(q + dq, r + dr, s + ds));
}

//Define your color‐scheme lookup
const colorScheme = {
  easy: {
    fill:    ["#b7d65c", "#7fb3ff"],
    outline: ["#165016", "#1c5aa6"],    
  },
  intermediate: {
    fill:    ["#b7d65c", "#7fb3ff"],
    outline: ["#165214", "#1c5aa6"],    
  },
  medium: {
    fill:    ["#ffc76e", "#7ea2ff"],
    outline: ["#b05c00", "#003b8b"],
  },
  hard: {
    fill:    ["#ff8888", "#88f"],
    outline: ["#700000", "#00008B"],
  },
  extreme: {
    fill:    ["#ff8888", "#d273ff"],
    outline: ["#8B0000", "#5a0070"],    
  },
};

export default function PuzzlePage() {
  const params = useParams();
  const puzzleId = decodeURIComponent(params.id);
  const router = useRouter();
  const { puzzles } = usePuzzles();

  // Find the puzzle with this ID
  const puzzle = puzzles.find((p) => p.id === puzzleId);

  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!puzzle) return; // in case puzzle is undefined

    // Load completed puzzles from localStorage (assumed to be an array of puzzle IDs)
    let storedCompleted = [];
    try {
      storedCompleted = JSON.parse(localStorage.getItem("completedPuzzles") || "[]");
    } catch (error) {
      console.error("Error parsing completedPuzzles from localStorage:", error);
    }

    if (storedCompleted.includes(puzzle.id)) {
      setHasChecked(true);
      return;
    }
    
    // Build a set of coordinate keys for each completed puzzle
    const completedCoords = new Set();
    storedCompleted.forEach((id) => {
      const cpuzzle = puzzles.find((p) => p.id === id);
      if (cpuzzle) {
        completedCoords.add(hexKey(cpuzzle.q, cpuzzle.r, cpuzzle.s));
      }
    });

    // Compute the neighbor keys of the current puzzle
    const neighbors = getNeighborKeys(puzzle.q, puzzle.r, puzzle.s);

    // Check if any neighbor coordinate matches a completed puzzle's coordinate
    const adjacent = neighbors.some((key) => completedCoords.has(key));

    // If the puzzle is not adjacent to any completed puzzle, redirect before loading
    if (!adjacent && completedCoords.size > 0) {
      router.push("/puzzle-select");
    } else {
      setHasChecked(true);
    }
  }, [puzzle, router]);

  if (!puzzle || !hasChecked) {
    return null;//<div>No puzzle found with ID: {puzzleId}</div>;
  }
  return (
    <div
      style={{
        width: "100dvw",
        height: "100svh",
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
        colorScheme = {colorScheme[puzzle.difficulty]}
        regionSize={puzzle.regionSize}
        puzzleId={puzzle.id}
        sizeMultiplier={puzzle.sizeMultiplier}
      />
    </div>
  );
}
