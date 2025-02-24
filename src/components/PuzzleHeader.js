import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FiHome, FiHelpCircle } from "react-icons/fi";

const PuzzleHeader = ({ puzzleId, isSelectMode = false }) => {
    const router = useRouter();
    const [showOverlay, setShowOverlay] = useState(false);

    const handleHomeClick = () => {
        router.push("/puzzle-select");
    };

    const toggleOverlay = () => {
        setShowOverlay((prev) => !prev);
    };

    const titleText = isSelectMode ? "Level Select" : `Level ${puzzleId}`;
    //   const overlayText = isSelectMode
    //     ? "Click a puzzle adjacent to a completed puzzle to play."
    //     : "Click and drag to make a region.";
    const overlayContent = isSelectMode ? (
        <p
            style={{
            fontFamily: "'Press Start 2P', sans-serif",
            lineHeight: "1.5",
            fontSize: "18px",
            margin: 0,
            padding: "15px 0 10px 0",
            }}
        >
            Completed levels are outlined in <strong style={{ color: "green" }}>green</strong>.
            <br />
            <strong>Click</strong> a level <strong>next to</strong> a completed level to play.
        </p>
        
    ) : (
        <>
        <p
            style={{
            fontFamily: "'Press Start 2P', sans-serif",
            lineHeight: "1.5",
            fontSize: "18px",
            }}
        >
            <strong>Goal:</strong> Split the map into <strong>regions</strong> to win.
            <br /> 
            The color with the most <strong>hexes</strong> wins that region.
            <br /> 
            The <strong>majority</strong> of <strong>regions</strong> must be the winning color.
            <br /> 
            <strong>All hexes</strong> must be part of a region.
        </p>
        <p
            style={{
            fontFamily: "'Press Start 2P', sans-serif",
            lineHeight: "1.5",
            fontSize: "18px",
            margin: 0,
            padding: "0 0 10px 0",

            }}>
            <strong style={{ fontSize: "20px", lineHeight: "2"}}>Controls: </strong>
            <br /> 
            <strong>Drag</strong> to create a region.
            <br />
            <strong>Drag</strong> from an existing region to <strong>add</strong> to it.
            <br />
            <strong>Click</strong> on a hex to <strong>remove</strong> it from the region.
            <br />
            <strong>Z</strong> to undo, <strong>R</strong> to reset.
        </p>
        </>
    );

    const pulseAnimationStyle =
        puzzleId === "0"
        ? {
            animation: "pulse 1.5s infinite",
            borderRadius: "50%", // ensure the background looks round if needed
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
            {/* Home Icon Button */}
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

            {/* Title */}
            <h1
            style={{
                margin: 0,
                fontFamily: "'Press Start 2P', sans-serif",
                fontSize: "24px",
                userSelect: "none",
            }}
            >
            {titleText}
            </h1>

            {/* How To Play Icon Button */}
            <button
            onClick={toggleOverlay}
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

        {/* How To Play Overlay */}
        {showOverlay && (
            <div
            className="overlayContainer"
            onClick={toggleOverlay}
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
                padding: "20px 30px",
                textAlign: "center",
                boxShadow: "0 0 20px rgba(0, 0, 0, 0.3)",
                animation: "popupFadeIn 0.4s ease forwards",
                maxWidth: "90%",
                }}
            >
                <h2
                className="overlayHeading"
                style={{
                    margin: 0,
                    marginBottom: "5px",
                    fontFamily: "'Press Start 2P', sans-serif",
                    fontWeight: "bold",
                }}
                >
                How To Play
                </h2>
                {overlayContent}
                <button
                className="overlayButton"
                onClick={toggleOverlay}
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
            transform: scale(1);
          }
          50% {
            background-color: yellow;
            transform: scale(1.3);
          }
          100% {
            background-color: #c6e2e9;
            transform: scale(1);
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
