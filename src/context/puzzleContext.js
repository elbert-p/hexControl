// src/context/PuzzleContext.js
"use client"
import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import basePuzzles from "../app/puzzleData";

const PuzzleContext = createContext();

export function usePuzzles() {
  return useContext(PuzzleContext);
}

export function PuzzleProvider({ children }) {
  const [puzzles, setPuzzles] = useState(() => [...basePuzzles]);

  // Optional: to avoid re-spawning workers on every re-render,
  // track whether we've begun generation in a ref or separate state:
  const hasStartedRef = useRef(false);

  useEffect(() => {
    // Kick off generation exactly once
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    // For each puzzle with null mapData, spawn a worker
    puzzles.forEach((pzl, idx) => {
      if (!pzl.mapData) {
        const worker = new Worker(new URL("../../src/workers/puzzleWorker.js", import.meta.url));
        worker.onmessage = (e) => {
          const { success, puzzleIndex, puzzleMap, error } = e.data;
          if (!success) {
            console.error("Puzzle generation failed:", error);
          } else {
            // store the result in context state
            setPuzzles((prev) => {
              const updated = [...prev];
              updated[puzzleIndex] = {
                ...updated[puzzleIndex],
                mapData: puzzleMap,
              };
              return updated;
            });
          }
          worker.terminate();
        };

        // Post your generation settings
        worker.postMessage({
          puzzleIndex: idx,
          baseData: pzl.generationSettings?.baseData ?? [],
          colorToWin: pzl.generationSettings?.colorToWin ?? 1,
          regionSize: pzl.generationSettings?.regionSize ?? 5,
          maxSolutions: pzl.generationSettings?.maxSolutions ?? 5,
          maxAttempts: pzl.generationSettings?.maxAttempts ?? 1000,
          difficultyThreshold: pzl.generationSettings?.difficultyThreshold ?? 4,
        });
      }
    });
  }, [puzzles]);

  // Provide puzzles + setPuzzles to the rest of the app
  return (
    <PuzzleContext.Provider value={{ puzzles, setPuzzles }}>
      {children}
    </PuzzleContext.Provider>
  );
}
