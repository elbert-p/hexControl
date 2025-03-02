// src/context/puzzleContext.js
"use client"
import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import basePuzzles from "../app/puzzleData";

const PuzzleContext = createContext();

export function usePuzzles() {
  return useContext(PuzzleContext);
}

export function PuzzleProvider({ children }) {
  const [puzzles, setPuzzles] = useState(() => [...basePuzzles]);
  // Ref to track active workers by puzzle index, to prevent duplicate generations.
  const activeWorkersRef = useRef({});

  // Helper function to spawn a worker for a specific puzzle index.
  const spawnWorkerForPuzzle = (puzzleIndex) => {
    if (activeWorkersRef.current[puzzleIndex]) return;
    activeWorkersRef.current[puzzleIndex] = true;

    const puzzle = puzzles[puzzleIndex];
    const puzzleId = puzzle.id; // use puzzle id for localStorage key
    const worker = new Worker(new URL("../../src/workers/puzzleWorker.js", import.meta.url));
    worker.onmessage = (e) => {
      const { success, puzzleIndex, puzzleMap, error } = e.data;
      if (!success) {
        console.error("Puzzle generation failed:", error);
      } else {
        // Update state and store generated mapData using the puzzle id.
        setPuzzles(prev => {
          const updated = [...prev];
          updated[puzzleIndex] = { ...updated[puzzleIndex], mapData: puzzleMap };
          return updated;
        });
        localStorage.setItem(`puzzle-map-${puzzleId}`, JSON.stringify(puzzleMap));
      }
      activeWorkersRef.current[puzzleIndex] = false;
      worker.terminate();
    };

    // Post the generation settings to the worker.
    worker.postMessage({
      puzzleIndex,
      baseData: puzzle.generationSettings?.baseData ?? [],
      colorToWin: puzzle.generationSettings?.colorToWin ?? 1,
      regionSize: puzzle.generationSettings?.regionSize ?? 5,
      maxSolutions: puzzle.generationSettings?.maxSolutions ?? 5,
      maxAttempts: puzzle.generationSettings?.maxAttempts ?? 1000,
      difficultyThreshold: puzzle.generationSettings?.difficultyThreshold ?? 4,
    });
  };

  // On mount, for each puzzle whose mapData is null, check localStorage using the puzzle id.
  // If a stored map is found, hydrate the puzzle. Otherwise, spawn a worker to generate it.
  useEffect(() => {
    puzzles.forEach((puzzle, idx) => {
      if (!puzzle.mapData) {
        const stored = localStorage.getItem(`puzzle-map-${puzzle.id}`);
        if (stored) {
          setPuzzles(prev => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], mapData: JSON.parse(stored) };
            return updated;
          });
        } else {
          spawnWorkerForPuzzle(idx);
        }
      }
    });
    // Empty dependency array ensures this runs only on mount.
  }, []);

  // resetPuzzle accepts a puzzle id. It finds the puzzle's index, removes the stored mapData,
  // resets the puzzle's mapData to null in state, and spawns a new worker.
  const resetPuzzle = (puzzleId) => {
    // Increment the completion count for this puzzle.
    const storedCounts = localStorage.getItem("puzzleCompletionCounts");
    let completionCounts = {};
    if (storedCounts) {
      try {
        completionCounts = JSON.parse(storedCounts);
      } catch (error) {
        console.error("Failed to parse puzzleCompletionCounts:", error);
      }
    }
    completionCounts[puzzleId] = (completionCounts[puzzleId] || 0) + 1;
    localStorage.setItem("puzzleCompletionCounts", JSON.stringify(completionCounts));

    const puzzleIndex = puzzles.findIndex(puzzle => puzzle.id === puzzleId);
    if (puzzleIndex === -1 || !puzzles[puzzleIndex].generationSettings) return;
    localStorage.removeItem(`puzzle-map-${puzzleId}`);
    setPuzzles(prev => {
      const updated = [...prev];
      updated[puzzleIndex] = { ...updated[puzzleIndex], mapData: null };
      return updated;
    });
    spawnWorkerForPuzzle(puzzleIndex);
  };

  return (
    <PuzzleContext.Provider value={{ puzzles, setPuzzles, resetPuzzle }}>
      {children}
    </PuzzleContext.Provider>
  );
}
