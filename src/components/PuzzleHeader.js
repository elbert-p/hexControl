import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiHome, FiHelpCircle, FiBarChart2 } from "react-icons/fi";

const PuzzleHeader = ({ puzzleId, isSelectMode = false, puzzles = [], completedPuzzles = [] }) => {
  const router = useRouter();
  // overlayType can be "stats", "howToPlay", or null
  const [overlayType, setOverlayType] = useState(null);
  const [completionCounts, setCompletionCounts] = useState({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 600 || window.innerHeight <= 600);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleHomeClick = () => {
    router.push("/puzzle-select");
  };

  useEffect(() => {
    // Read the key "puzzleCompletionCounts" from local storage and parse it
    const storedCounts = localStorage.getItem("puzzleCompletionCounts");
    if (storedCounts) {
      try {
        const parsedCounts = JSON.parse(storedCounts);
        setCompletionCounts(parsedCounts);
      } catch (err) {
        console.error("Error parsing puzzleCompletionCounts:", err);
      }
    }
  }, []);

  // Toggle overlay: if the current overlay is open, close it; otherwise, open the requested overlay.
  const toggleOverlay = (type) => {
    setOverlayType((prev) => (prev === type ? null : type));
  };

  const titleText = isSelectMode ? "Level Select" : `Level ${puzzleId}`;

  const completedDifficultyCounts = puzzles.reduce((acc, puzzle) => {
    if (completedPuzzles.includes(puzzle.id)) {
      const difficulty = puzzle.difficulty.toLowerCase();
      acc[difficulty] = (acc[difficulty] || 0) + 1;
    }
    return acc;
  }, {});

  const infinitePuzzleIds = puzzles
    .filter(puzzle => puzzle.mapData === null && puzzle.generationSettings)
    .map(puzzle => puzzle.id);

  const infiniteCompletionCounts = Object.entries(completionCounts)
    .filter(([level]) => infinitePuzzleIds.includes(level))
    .sort(([a], [b]) => a.localeCompare(b));

  const entries = infiniteCompletionCounts.sort(([a], [b]) => a.localeCompare(b));
  const infiniteCompletionsDisplay =
    entries.length > 0
      ? entries.map(([level, count], index) => (
          <span key={level}>
            <strong>{level}:</strong>&nbsp;{count}
            {index < entries.length - 1 ? ", " : ""}
          </span>
        ))
      : "None (Complete A, B...)";

  // Content for the statistics overlay.
  const statsOverlayContent = (
    <ul
      style={{
        fontFamily: "'Press Start 2P', sans-serif",
        lineHeight: "1.5",
        fontSize: "18px",
        margin: 0,
        paddingBlock: "15px 10px",
        paddingInlineStart: "20px",
        textAlign: "left",
        listStylePosition: "outside",
      }}
    >
      <li style={{ marginBottom: "15px" }}>
        <strong>Puzzles Completed:</strong> {completedPuzzles.length}&nbsp;/&nbsp;{puzzles.length}&nbsp;&nbsp;({Math.round(100*completedPuzzles.length / puzzles.length)}%)
      </li>
      <li style={{ marginBottom: "15px" }}>
        <strong style={{color: "green"}}>Easy:</strong>&nbsp;{completedDifficultyCounts.easy || 0},
        <strong style={{color: "#e6cf01"}}> Intermediate:</strong>&nbsp;{completedDifficultyCounts.intermediate || 0},
        <strong style={{color: "orange"}}> Medium:</strong>&nbsp;{completedDifficultyCounts.medium || 0},
        <strong style={{color: "red"}}> Hard:</strong>&nbsp;{completedDifficultyCounts.hard || 0}
      </li>
      <li>
        <strong>Infinite Completions:</strong> {infiniteCompletionsDisplay}
      </li>
    </ul>
  );

  // Content for the how-to-play overlay.
  const howToPlayOverlayContent = 
    isSelectMode ? (
        <ul
            style={{
                fontFamily: "'Press Start 2P', sans-serif",
                lineHeight: "1.5",
                fontSize: "18px",
                margin: 0,
                paddingBlock: "15px 10px",
                paddingInlineStart: "20px",
                textAlign: "left",
                listStylePosition: "outside",
            }}
        >
            <li style={{ marginBottom: "15px" }}>
                <strong>Completed</strong> levels are outlined in{" "}
                <strong style={{ color: "green" }}>green</strong>.
            </li>
            <li style={{ marginBottom: "15px" }}>
                <strong>Letter</strong> levels [A, B, etc.] are randomly generated and{" "}
                <strong>replayable</strong>.
            </li>
            <li>
                <strong>Click</strong> a level <strong>next to</strong> a completed level to play.
            </li>
        </ul>   
    ) : (
        <>
        <ul
            style={{
            fontFamily: "'Press Start 2P', sans-serif",
            lineHeight: "1.5",
            fontSize: "18px",
            margin: 0,
            paddingBlock: "15px 10px",
            paddingInlineStart: "10px",
            textAlign: "left",
            listStylePosition: "outside",
            }}
        >
            <li style={{ marginBottom: "10px" }}>
            <strong>Goal:</strong> Split the map into <strong>regions</strong> to win.
            </li>
            <li style={{ marginBottom: "10px" }}>
            The <strong>majority</strong> of <strong>regions</strong> must be the winning color.
            </li>
            <li style={{ marginBottom: "10px" }}>
            The color with the most <strong>hexes</strong> wins each region.
            </li>
            <li style={{ marginBottom: "10px" }}>
            <strong>All hexes</strong> must be part of a region.
            </li>
        </ul>
        <ul
            style={{
            fontFamily: "'Press Start 2P', sans-serif",
            lineHeight: "1.5",
            fontSize: "18px",
            margin: 0,
            paddingBlock: "0px 10px",
            paddingInlineStart: "10px",
            textAlign: "left",
            listStylePosition: "outside",
            }}
        >
            <strong style={{ fontSize: "20px", color: "#06404B" }}>Controls:</strong>
            <span style={{ display: "block", marginBottom: "10px" }}></span>
            <li style={{ marginBottom: "10px" }}>
            <strong>Drag</strong> to create a region.
            </li>
            <li style={{ marginBottom: "10px" }}>
            <strong>Drag</strong> from an existing region to <strong>add</strong> to it.
            </li>
            <li style={{ marginBottom: "10px" }}>
            <strong>Click</strong> on a hex to <strong>remove</strong> it from the region.
            </li>
            {!isMobile && (
            <li>
                <strong>Z</strong> to undo, <strong>R</strong> to reset.
            </li>
            )}
        </ul>
        </>
    );

  // Determine the overlay heading and content based on the overlayType.
  const overlayHeading =
    overlayType === "stats" ? "Statistics" : isSelectMode ? "Level Select" : "How To Play";
  const overlayContent =
    overlayType === "stats" ? statsOverlayContent : howToPlayOverlayContent;

  const pulseAnimationStyle =
    puzzleId === "0"
      ? {
          animation: "pulse 1.5s infinite",
          borderRadius: "50%",
        }
      : {};

  return (
    <>
      <header
        style={{
          width: "100%",
          boxSizing: "border-box",
          backgroundColor: "#c6e2e9",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 20px",
          borderBottom: "2px solid white",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Left Icon Button: Home or Statistics based on mode */}
        {isSelectMode ? (
          <button
            onClick={() => toggleOverlay("stats")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "32px",
              display: "flex",
              alignItems: "center",
              padding: "0",
            }}
            aria-label="Statistics"
          >
            <FiBarChart2 />
          </button>
        ) : (
          <button
            onClick={handleHomeClick}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "32px",
              display: "flex",
              alignItems: "center",
              padding: "0",
            }}
            aria-label="Home"
          >
            <FiHome />
          </button>
        )}

        {/* Title */}
        <h1
          style={{
            margin: 0,
            fontFamily: "'Press Start 2P', sans-serif",
            fontSize: "24px",
            userSelect: "none",
            fontWeight: "normal",
          }}
        >
          {titleText}
        </h1>

        {/* Right Icon Button: Always the How To Play button */}
        <button
          onClick={() => toggleOverlay("howToPlay")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "32px",
            display: "flex",
            alignItems: "center",
            padding: "0",
            ...pulseAnimationStyle,
          }}
          aria-label="How to Play"
        >
          <FiHelpCircle />
        </button>
      </header>

      {/* Overlay */}
      {overlayType && (
        <div
          className="overlayContainer"
          onClick={() => toggleOverlay(overlayType)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255, 255, 255, 0)",
            animation: "backdropFadeIn 0.3s ease forwards",
            zIndex: 999,
          }}
        >
          <div
            className="overlayBox"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              border: "6px solid #228B22",
              borderRadius: "10px",
              padding: "15px 20px",
              textAlign: "center",
              boxShadow: "0 0 20px rgba(0, 0, 0, 0.3)",
              animation: "popupFadeIn 0.4s ease forwards",
              maxWidth: "450px",
            }}
          >
            <h2
              className="overlayHeading"
              style={{
                margin: 0,
                marginBottom: "5px",
                fontFamily: "'Press Start 2P', sans-serif",
                color: "#06404B",
              }}
            >
              {overlayHeading}
            </h2>
            {overlayContent}
            <button
              className="overlayButton"
              onClick={() => toggleOverlay(overlayType)}
              style={{
                padding: "10px 20px",
                fontSize: "18px",
                cursor: "pointer",
                backgroundColor: "#a3bf56",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontFamily: "'Press Start 2P', sans-serif",
                transition: "background-color 0.3s ease",
                marginTop: "15px",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0% {
            background-color: #c6e2e9;
            transform: scale(0.9);
          }
          50% {
            background-color: yellow;
            transform: scale(1.3);
          }
          100% {
            background-color: #c6e2e9;
            transform: scale(0.9);
          }
        }
        @keyframes backdropFadeIn {
          0% {
            background-color: rgba(255, 255, 255, 0);
          }
          100% {
            background-color: rgba(255, 255, 255, 0.6);
          }
        }
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
      `}</style>
    </>
  );
};

export default PuzzleHeader;
