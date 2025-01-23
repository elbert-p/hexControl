// /src/components/HexPuzzleWrapper.js
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import HexGridPuzzle from "./HexGridPuzzle";
import { useRouter } from "next/navigation";

/**
 * A wrapper for HexGridPuzzle that:
 *  1) Accepts mapData, colorToWin, regionSize.
 *  2) Displays puzzle stats:
 *     - Color to Win (as a small hex)
 *     - Hexes per Region (displayed above the puzzle)
 *     - Regions Made (# correct-size selections / total)
 *     - Regions Won (# that have colorToWin majority / needed for majority)
 *  3) Has keyboard shortcuts text.
 *  4) Displays a "Return to Home" button upon puzzle completion.
 */
export default function HexPuzzleWrapper({
  mapData,
  colorToWin,
  regionSize,
  sizeMultiplier,
  puzzleId, // Added puzzleId prop to identify the puzzle
}) {
  const router = useRouter();
  // The puzzle will send us its internal states via onPuzzleStateChange
  const [puzzleState, setPuzzleState] = useState({
    selections: [],
    hexStates: {},
  });

  // Refs and state for scaling the puzzle if it's too tall
  const puzzleContainerRef = useRef(null);
  const puzzleRef = useRef(null);
  const [scale, setScale] = useState(1);

  // Handler to receive puzzle updates:
  function handlePuzzleStateChange(newState) {
    setPuzzleState(newState);
  }

  // Calculate total possible regions:
  const totalHexes = mapData.length;
  const totalRegions = Math.floor(totalHexes / regionSize);
  const neededForMajority = Math.ceil(totalRegions / 1.9999999);

  // Count how many selections have exactly regionSize cells:
  const regionsMade = puzzleState.selections.filter(
    (sel) => sel.cells.length === regionSize
  ).length;

  // Count how many of those are "won" = colorToWin is greater than other color:
  const regionsWon = puzzleState.selections.reduce((count, sel) => {
    if (sel.cells.length === regionSize) {
      const cToWin = sel.cells.filter(
        (ck) => puzzleState.hexStates[ck] === colorToWin
      ).length;
      const cOther = regionSize - cToWin;
      if (cToWin > cOther) count++;
    }
    return count;
  }, 0);

  // Hex code for the color that should win:
  const colorHexToWin = colorToWin === 0 ? "#ff8888" : "#88f"; // Example colors

  // Determine if the puzzle is complete
  const isComplete = regionsMade === totalRegions && regionsWon >= neededForMajority;

  // HexIcon Component (unchanged)
  const HexIcon = ({
    text,
    color = "#ffdf88",
    strokeColor = "#333",
    size = 40,
    textColor = "#333",
    fontSize = "18",
  }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ verticalAlign: "middle" }}
      overflow="visible"
    >
      <polygon
        points="50,0 93,25 93,75 50,100 7,75 7,25"
        fill={color}
        stroke={strokeColor}
        strokeWidth="8"
      />
      {text && (
        <text
          x="50"
          y="50"
          fontSize={fontSize}
          fill={textColor}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="'Press Start 2P', sans-serif" // Blocky font
          stroke="none"
          fontWeight="900"
        >
          {text}
        </text>
      )}
    </svg>
  );

  // Function to mark the puzzle as completed
  const markPuzzleAsCompleted = () => {
    const completedPuzzles = JSON.parse(localStorage.getItem("completedPuzzles")) || [];
    if (!completedPuzzles.includes(puzzleId)) {
      completedPuzzles.push(puzzleId);
      localStorage.setItem("completedPuzzles", JSON.stringify(completedPuzzles));
    }
  };

  // Effect to handle puzzle completion
  useEffect(() => {
    if (isComplete) {
      markPuzzleAsCompleted();
    }
  }, [isComplete]);

  // Recalculate the scale if the puzzle is too tall:
  const measureAndSetScale = () => {
    if (puzzleContainerRef.current && puzzleRef.current) {
      const containerHeight = puzzleContainerRef.current.offsetHeight;
      const puzzleHeight = puzzleRef.current.offsetHeight;
      if (puzzleHeight > containerHeight) {
        setScale(containerHeight / puzzleHeight);
      } else {
        setScale(1);
      }
    }
  };

  // When layout changes (or window resizes), measure again
  useLayoutEffect(() => {
    const handleResize = () => {
      measureAndSetScale();
    };
    window.addEventListener("resize", handleResize);

    measureAndSetScale(); // Initial measure

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // If the puzzle changes significantly (e.g., color changes, region changes)
  // we can measure again:
//   useEffect(() => {
//     measureAndSetScale();
//   }, [puzzleState, mapData]);

  return (
    <div
      style={{
        height: "calc(100vh - 160px)", // Set height to window height minus 150px
        display: "flex",
        justifyContent: "center", // Center vertically
        alignItems: "center",
        padding: "20px", // Added padding for better spacing on smaller screens
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxHeight: "100%", // Ensure it doesn't exceed the wrapper's height
        }}
      >
        {/* Puzzle Info Above the Puzzle */}
        <div
          style={{
            display: "flex",
            gap: "40px", // Space between the two items
            marginBottom: "40px",
            alignItems: "center",
            fontSize: 20,
            flexShrink: 0, // Prevent shrinking
          }}
        >
          {/* Color to Win */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ marginRight: 8 }}>Color to Win:</span>
            <HexIcon color={colorHexToWin} />
          </div>

          {/* Hexes per Region */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ marginRight: 8 }}>Hexes per Region:</span>
            <HexIcon
              text={regionSize}
              color="#ffdf88"
              textColor="#333"
              size={40}
              fontSize="50"
            />
          </div>
        </div>

        {/* Container for the Puzzle (with ref to measure available space) */}
        <div
          ref={puzzleContainerRef}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            height: "100%",
            width: "100%",
            overflow: "hidden", // Hide overflow (if any)
          }}
        >
          {/* Scalable Wrapper (with ref to measure puzzle size) */}
          <div
            ref={puzzleRef}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "center",
            }}
          >
            <HexGridPuzzle
              mapData={mapData}
              colorToWin={colorToWin}
              regionSize={regionSize}
              sizeMultiplier={sizeMultiplier}
              onPuzzleStateChange={handlePuzzleStateChange}
            />
          </div>
        </div>

        {/* Puzzle Info Below the Puzzle */}
        <div
          style={{
            display: "flex",
            gap: "40px", // Space between the two items
            marginTop: "40px",
            alignItems: "center",
            fontSize: 20,
            flexShrink: 0, // Prevent shrinking
          }}
        >
          {/* Regions Made */}
          <div>
            Regions Made:{" "}
            <strong style={{ fontFamily: "'Press Start 2P', sans-serif" }}>
              {regionsMade} / {totalRegions}
            </strong>
          </div>

          {/* Regions Won */}
          <div>
            Regions Won:{" "}
            <strong style={{ fontFamily: "'Press Start 2P', sans-serif" }}>
              {regionsWon} / {neededForMajority}
            </strong>
          </div>
        </div>

        {/* Return to Home Button */}
        {isComplete && (
          <button
            onClick={() => router.push("/puzzle-select")}
            style={{
              marginTop: 30,
              padding: "10px 20px",
              fontSize: "18px",
              cursor: "pointer",
              backgroundColor: "#a3bf56",
              color: "white",
              border: "none",
              borderRadius: "10px",
              fontFamily: "'Press Start 2P', sans-serif",
            }}
          >
            Home
          </button>
        )}

        {/* Keyboard Shortcuts fixed at the bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 40, // Adjusted for better spacing
            textAlign: "center",
            fontSize: 18,
            padding: 20,
          }}
        >
          <p style={{ marginTop: 0 }}>
            <strong>Keyboard Shortcuts:</strong>
          </p>
          <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
            <li>
              <kbd>Z</kbd>: Undo the last selection
            </li>
            <li>
              <kbd>R</kbd>: Reset all selections
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
