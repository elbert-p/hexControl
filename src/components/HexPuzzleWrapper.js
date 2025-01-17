// /src/components/HexPuzzleWrapper.js
"use client";

import React, { useState, useEffect } from "react";
import HexGridPuzzle from "./HexGridPuzzle";

/**
 * A wrapper for HexGridPuzzle that:
 *  1) Accepts puzzleData, colorToWin, regionSize.
 *  2) Displays puzzle stats:
 *     - Color to Win (as a small hex)
 *     - Regions Made (# correct-size selections / total)
 *     - Regions Won (# that have colorToWin majority / needed for majority)
 *  3) Moves keyboard shortcuts text here.
 */
export default function HexPuzzleWrapper({
  puzzleData,
  colorToWin = 0,   // 0 => greenish, 1 => bluish
  regionSize = 3,
}) {
  // The puzzle will send us its internal states via onPuzzleStateChange
  const [puzzleState, setPuzzleState] = useState({
    selections: [],
    hexStates: {},
  });

  // Handler to receive puzzle updates:
  function handlePuzzleStateChange(newState) {
    setPuzzleState(newState);
  }

  // Calculate total possible regions:
  const totalHexes = puzzleData.length;
  const totalRegions = Math.floor(totalHexes / regionSize);
  const neededForMajority = Math.ceil(totalRegions / 2);

  // Count how many selections have exactly regionSize cells:
  const regionsMade = puzzleState.selections.filter(
    (sel) => sel.cells.length === regionSize
  ).length;

  // Count how many of those are "won" = colorToWin is greater than other color:
  function countWonRegions() {
    let count = 0;
    for (let sel of puzzleState.selections) {
      if (sel.cells.length === regionSize) {
        let cToWin = 0;
        let cOther = 0;
        for (let ck of sel.cells) {
          if (puzzleState.hexStates[ck] === colorToWin) cToWin++;
          else cOther++;
        }
        if (cToWin > cOther) count++;
      }
    }
    return count;
  }
  const regionsWon = countWonRegions();

  // Hex code for the color that should win:
  const colorHexToWin = colorToWin === 0 ? "#ff8888" : "#88f"; //#d8ee99, #88f

  // For a small hex shape, we can do an inline SVG or a simple rotated diamond.
  // Let's do a small "pointy-top" style:
  // We'll approximate it via a <svg><polygon> or we can do a small "hex" icon.
  const hexIcon = (
    <svg
      width="25"
      height="25"
      viewBox="0 0 100 100"
      style={{ verticalAlign: "middle" }}
      overflow={"visible"}
    >
      <polygon
        points="50,0 93,25 93,75 50,100 7,75 7,25"
        fill={colorHexToWin}
        stroke="#333"
        strokeWidth="8"
      />
    </svg>
  );

  return (
    <div
        style={{
            display: "flex",                // Use Flexbox for layout
            flexDirection: "column",        // Arrange children vertically
            justifyContent: "center",       // Center vertically
            alignItems: "center",           // Center horizontally
            height: "100vh",                // Full viewport height
            textAlign: "center",
            userSelect: "none",
            position: "relative",            // To position keyboard shortcuts at the bottom
        }}>
        {/* Render the puzzle */}
        <HexGridPuzzle
        puzzleData={puzzleData}
        onPuzzleStateChange={handlePuzzleStateChange}
        />

        {/* Puzzle Info, placed beneath the puzzle with spacing */}
        <div
            style={{
                marginTop: 10,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
            }}>
            <div style={{ display: "flex", alignItems: "center", }}>
                <div style={{ marginRight: 8, marginBottom: 9, marginTop: 9}}>Color to Win:</div> 
                {hexIcon}
            </div>
            <div style={{ marginBottom: 9 }}>Hexes per Region: <strong>{regionSize}</strong> </div> 
            <div style={{ marginBottom: 9 }}>Regions Made: <strong>{regionsMade} / {totalRegions}</strong> </div> 
            <div style={{ marginBottom: 9 }}>Regions Won: <strong>{regionsWon} / {neededForMajority}</strong> </div>
        </div>

        {/* Keyboard Shortcuts fixed at the bottom */}
        <div
            style={{
            position: "absolute",           // Position fixed at the bottom
            bottom: 70,                     // 70px padding from the bottom
            textAlign: "center",            // Center the text
            }}>
        <p>
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
  );
}
