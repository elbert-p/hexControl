// /src/components/HexPuzzleWrapper.js
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import HexGridPuzzle from "./HexGridPuzzle";
import { useRouter } from "next/navigation";

export default function HexPuzzleWrapper({
  mapData,
  colorToWin,
  regionSize,
  sizeMultiplier,
  puzzleId,
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
  const colorHexToWin = colorToWin === 0 ? "#ff8888" : "#88f";

  // Determine if the puzzle is complete
  const isComplete = regionsMade === totalRegions && regionsWon >= neededForMajority;

  const [showOverlay, setShowOverlay] = useState(false);

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
      const containerWidth = puzzleContainerRef.current.offsetWidth;
      const puzzleHeight = puzzleRef.current.offsetHeight;
      const puzzleWidth = puzzleRef.current.offsetWidth;
  
      const heightScale = containerHeight / puzzleHeight;
      const widthScale = containerWidth / puzzleWidth;
      // console.log("containerWidth / puzzleWidth", containerWidth, puzzleWidth);
      // console.log("heightScale", heightScale);
      // Use the smaller of the two scales
      const newScale = Math.min(heightScale, widthScale);
      // console.log(newScale)
      // Only shrink if needed; otherwise keep scale at 1
      setScale(newScale < 1 ? newScale : 1);
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
        height: "100%",
        maxWidth: "100%", // Ensure it doesn't exceed the wrapper's height
        //height: "calc(100dvh - 160px)", // Set height to window height minus 160px
        display: "flex",
        justifyContent: "center", // Center vertically
        alignItems: "center",
        padding: "20px", // Added padding for better spacing on smaller screens
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          padding: "40px",
          outline: "2px solid white",
          borderRadius: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxHeight: "100%", // Ensure it doesn't exceed the wrapper's height
          maxWidth: "100%", // Ensure it doesn't exceed the wrapper's height

          userSelect: "none", // Prevent text selection
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
            touchAction: "none", // Prevent touch scrolling
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
              puzzleComplete={isComplete}
              onAnimationComplete={() => setShowOverlay(true)}
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
            // userSelect: "none", // Prevent text selection
          }}
        >
          {/* Regions Made */}
          <div>
            Regions Made: {" "} <wbr/>
            <strong style={{ fontFamily: "'Press Start 2P', sans-serif", whiteSpace: "nowrap" }}>
              {regionsMade} / {totalRegions}
            </strong>
          </div>

          {/* Regions Won */}
          <div>
            Regions Won: {" "} <wbr/>
            <strong style={{ fontFamily: "'Press Start 2P', sans-serif", whiteSpace: "nowrap" }}>
              {regionsWon} / {neededForMajority}
            </strong>
          </div>
        </div>

        {/* Puzzle Complete Overlay */}
        {showOverlay && (
          <>
              {/* CSS-in-JS Styles with Backdrop and Box Animations */}
              <style jsx>{`
              /* Keyframes for Backdrop Fade-In */
              @keyframes backdropFadeIn {
                  0% {
                  background-color: rgba(255, 255, 255, 0);
                  }
                  100% {
                  background-color: rgba(255, 255, 255, 0.6);
                  }
              }

              /* Keyframes for Box Fade-In and Scale-Up */
              @keyframes popupFadeIn {
                  0% {
                  opacity: 0;
                  transform: scale(0.8);
                  }
                  100% {
                  opacity: 1;
                  transform: scale(1);
                  }
              }

              /* Overlay Container with Backdrop Animation */
              .overlayContainer {
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  /* Initial background set to transparent */
                  background-color: rgba(255, 255, 255, 0);
                  z-index: 9999;
                  /* Apply backdrop fade-in animation */
                  animation: backdropFadeIn 0.3s ease forwards;
              }

              /* Overlay Box with Popup Animation */
              .overlayBox {
                  background: white; //#ffd
                  border: 6px solid #228B22;
                  border-radius: 10px;
                  padding: 20px 30px;
                  text-align: center;
                  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
                  /* Apply popup fade-in and scale-up animation */
                  animation: popupFadeIn 0.4s ease forwards;
              }

              /* Heading Styles */
              .overlayHeading {
                  margin: 0;
                  margin-bottom: 25px;
                  font-family: 'Press Start 2P', sans-serif;
              }

              /* Button Styles */
              .overlayButton {
                  padding: 10px 20px;
                  font-size: 18px;
                  cursor: pointer;
                  background-color: #a3bf56;
                  color: white;
                  border: none;
                  border-radius: 10px;
                  font-family: 'Press Start 2P', sans-serif;
                  transition: background-color 0.3s ease;
              }

              /* Button Hover Effect */
              .overlayButton:hover {
                  background-color: #8fae45; /* Darken button on hover */
              }
              `}</style>

              {/* Overlay Structure with Applied Classes */}
              <div className="overlayContainer">
              <div className="overlayBox">
              <h2 className="overlayHeading">
                <span style={{ fontWeight: 'normal' }}>You solved</span> Level {puzzleId}!
              </h2>
                  <button
                  className="overlayButton"
                  onClick={() => router.push("/puzzle-select")}
                  >
                  Home
                  </button>
              </div>
              </div>
          </>
          )}
      </div>
    </div>
  );
}
