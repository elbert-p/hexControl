// /src/components/HexPuzzleWrapper.js
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import HexGridPuzzle from "./HexGridPuzzle";
import HexIcon from "./HexIcon";
import { useRouter } from "next/navigation";
import { usePuzzles } from "../context/puzzleContext";
import { useAuth } from "../context/AuthContext";

export default function HexPuzzleWrapper({
  mapData,
  colorToWin,
  colorScheme,
  regionSize,
  sizeMultiplier,
  puzzleId,
  // Optional hooks used by the daily Hexle. When `onSolved` is provided the wrapper
  // skips its own level bookkeeping (completed list, counts, reset, overlay).
  onSolved,
  onSolvedAnimationEnd,
  onPuzzleStateChange,
  initialSelections,
  readOnly = false,
}) {
  const externallyManaged = typeof onSolved === "function";

  const router = useRouter();
  const { puzzles, resetPuzzle } = usePuzzles();
  // Letter levels (A, B, ...) are generated and replayable, so they offer "Play again".
  const isReplayable =
    !externallyManaged && !!puzzles?.find((p) => p.id === puzzleId)?.generationSettings;
  const { notifyLocalDataUpdated } = useAuth();

  // The puzzle will send us its internal states via onPuzzleStateChange
  const [puzzleState, setPuzzleState] = useState({
    selections: [],
    hexStates: {},
  });

  const [puzzleCounted, setPuzzleCounted] = useState(false);

  // Refs and state for scaling the puzzle if it's too tall
  const puzzleContainerRef = useRef(null);
  const puzzleRef = useRef(null);
  const [scale, setScale] = useState(1);

  // Handler to receive puzzle updates:
  function handlePuzzleStateChange(newState) {
    setPuzzleState(newState);
    if (onPuzzleStateChange) onPuzzleStateChange(newState);
  }

  // Calculate total possible regions:
  const totalHexes = mapData ? mapData.length : 0;
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
  const colorHexToWin = colorScheme.fill[colorToWin]; //colorToWin === 0 ? "#ff8888" : "#88f";

  // Determine if the puzzle is complete
  const isComplete = mapData 
  ? regionsMade === totalRegions && regionsWon >= neededForMajority 
  : false;

  const [showOverlay, setShowOverlay] = useState(false);
  // Read-only (review) puzzles start in the static "View puzzle" look.
  const [showRegionFill, setShowRegionFill] = useState(!readOnly);

  const incrementPuzzleCompletionCount = () => {
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
    // notifyLocalDataUpdated();
  }
  
  // Function to mark the puzzle as completed
  const markPuzzleAsCompleted = () => {
    incrementPuzzleCompletionCount();
    const completedPuzzles = JSON.parse(localStorage.getItem("completedPuzzles")) || [];
    if (!completedPuzzles.includes(puzzleId)) {
      completedPuzzles.push(puzzleId);
      localStorage.setItem("completedPuzzles", JSON.stringify(completedPuzzles));
    }
    setPuzzleCounted(true);
    notifyLocalDataUpdated(); 
  };

  // Effect to handle puzzle completion
  useEffect(() => {
    if (readOnly) return; // reviewing a finished puzzle: nothing to record
    if (isComplete && !puzzleCounted) {
      if (externallyManaged) {
        setPuzzleCounted(true);
        onSolved(puzzleState.selections);
      } else {
        markPuzzleAsCompleted();
      }
    } else {
      setShowRegionFill(true);   // let the fill animation run again
      setShowOverlay(false);     // make sure the overlay isn’t showing
    }
  }, [isComplete]);

  const puzzleSolvedRef = useRef(false); //for reset to work
    useEffect(() => {
      if (isComplete) {
        puzzleSolvedRef.current = true;
      }
  }, [isComplete]);

  
  // Generate a fresh map for a replayable level and start over on this page.
  const awaitingNewMapRef = useRef(false);
  const handlePlayAgain = () => {
    puzzleSolvedRef.current = false; // already reset here, so don't reset again on unmount
    awaitingNewMapRef.current = true;
    setPuzzleState({ selections: [], hexStates: {} }); // old regions mustn't count on the new map
    setPuzzleCounted(false);
    setShowOverlay(false);
    setShowRegionFill(true);
    resetPuzzle(puzzleId);
  };

  useEffect(() => { //reset puzzle when user navigates away
    return () => {
      if (puzzleSolvedRef.current && !externallyManaged && !readOnly) {
        resetPuzzle(puzzleId);
      }
    };
  }, []);
  

  // Recalculate the scale if the puzzle is too tall:
  const measureAndSetScale = () => {
    if (puzzleContainerRef.current && puzzleRef.current) {
      puzzleContainerRef.current.style.height = "100%"; // Reset to measure
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
      setScale(newScale < 1 ? newScale : 1);
      puzzleContainerRef.current.style.height = `${puzzleRef.current.offsetHeight * newScale}px`;
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

  useEffect(() => {
    const handleOrientationChange = () => {
      // Wait a short time for the orientation change to settle
      setTimeout(() => {
        measureAndSetScale();
      }, 300);
    };
  
    window.addEventListener("orientationchange", handleOrientationChange);
    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, []);

  // A regenerated map mounts a new board, so size it once it arrives.
  useLayoutEffect(() => {
    if (mapData && awaitingNewMapRef.current) {
      awaitingNewMapRef.current = false;
      measureAndSetScale();
    }
  }, [mapData]);

  // If the puzzle changes significantly (e.g., color changes, region changes)
  // we can measure again:
  // useEffect(() => {
  //   measureAndSetScale();
  // }, [puzzleState, mapData]);

  return (
    <div  
    style={{
      flex: "1 1 0%",
      display: "flex",
      justifyContent: "center",
      flexDirection: "column",
      minHeight: 0,
    }}>
    {!mapData ? (
      <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
      }}
    >
      <h2 style={{                
        fontFamily: "sans-serif",
        fontSize: "24px",
        userSelect: "none",
        fontWeight: "normal",}}>Generating Puzzle...</h2>
    </div>) : (
    <div className="dynamicWrapper"
      style={{
        outline: "2px solid white",
        borderRadius: "20px",
        margin: "20px",
        minHeight: "0",
        minWidth: "0",
        maxWidth: "calc(100dvw - 30px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        // padding: "0px",
        boxSizing: "border-box"
      }}
    >
      <div
        style={{
          // padding: "40px",
          // borderRadius: "20px",
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
            width: "100%",
            boxSizing: "border-box",
            justifyContent: "space-between",
            gap: "40px", // Space between the two items
            padding: "20px",
            // marginBottom: "40px", //change to 20px on small screens
            alignItems: "center",
            fontSize: 20,
            flexShrink: 0, // Prevent shrinking
            // paddingTop: "40px", paddingInline: "40px"//change to 20px on small screens
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
            overflow: "hidden",
            touchAction: "none", // Prevent touch scrolling
            marginBlock: "15px"
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
              colorScheme = {colorScheme}
              regionSize={regionSize}
              sizeMultiplier={sizeMultiplier}
              onPuzzleStateChange={handlePuzzleStateChange}
              puzzleComplete={isComplete}
              showRegionFill={showRegionFill}
              onAnimationComplete={() =>
                onSolvedAnimationEnd ? onSolvedAnimationEnd() : setShowOverlay(true)
              }
              initialSelections={initialSelections}
              readOnly={readOnly}
            />
          </div>
        </div>

        {/* Puzzle Info Below the Puzzle */}
        <div
          style={{
            display: "flex",
            width: "100%",
            boxSizing: "border-box",
            justifyContent: "space-between",
            gap: "40px", // Space between the two items
            padding: "20px",
            // marginTop: "40px", //change to 20px on small screens
            alignItems: "center",
            fontSize: 20,
            flexShrink: 0, // Prevent shrinking
            userSelect: "none", // Prevent text selection
            touchAction: "none", //added
            // paddingBottom: "40px", paddingInline: "40px"//change to 20px on small screens
          }}
        >
          {/* Regions Made */}
          <div>
            Regions Made: {" "} <wbr/>
            <strong style={{ fontFamily: "sans-serif", whiteSpace: "nowrap" }}>
              {regionsMade} / {totalRegions}
            </strong>
          </div>

          {/* Regions Won */}
          <div>
            Regions Won: {" "} <wbr/>
            <strong style={{ fontFamily: "sans-serif", whiteSpace: "nowrap" }}>
              {regionsWon} / {neededForMajority}
            </strong>
          </div>
        </div>

        {/* Puzzle Complete Overlay */}
        {showOverlay && (
              <div className="overlayContainer">
                <div className="overlayBox">
                  <h2 className="overlayHeading">
                    <span style={{ fontWeight: "normal" }}>You solved</span> Level {puzzleId}!
                  </h2>
                  <div className={`overlayActions${isReplayable ? "" : " inlineLink"}`}>
                    <div className="overlayButtons">
                      {isReplayable && (
                        <button className="overlayButton" onClick={handlePlayAgain}>
                          Play again
                        </button>
                      )}
                      <button
                        className="overlayButton"
                        onClick={() => router.push("/puzzle-select")}
                      >
                        Continue
                      </button>
                    </div>
                    <button
                      className="overlayLink"
                      onClick={() => {
                        setShowOverlay(false);   // close the popup
                        setShowRegionFill(false); // strip the fill
                      }}
                    >
                      View puzzle
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Continue button (rendered below dynamicWrapper) */}
      {puzzleCounted && !externallyManaged && !showOverlay && !showRegionFill && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            marginTop: "0px",
            marginBottom: "10px",
          }}
        >
          {isReplayable && (
            <button className="overlayButton" onClick={handlePlayAgain}>
              Play again
            </button>
          )}
          <button
            className="overlayButton"
            onClick={() => router.push("/puzzle-select")}
          >
            Continue
          </button>
        </div>
      )}

    </div>
  );
}
