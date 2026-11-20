// src/components/HexleResults.js
"use client";

import React, { useEffect, useRef, useState } from "react";
import { FiShare2, FiX } from "react-icons/fi";
import HexIcon from "./HexIcon";
import { difficultyColor } from "../app/difficultyStyles";
import {
  DAILY_PUZZLES,
  buildShareText,
  formatCountdown,
  formatTime,
  getHexleNumber,
  msUntilLocalMidnight,
  totalTime,
} from "../app/hexle/daily";

/** Copy text to the clipboard, with a fallback for non-secure contexts. */
async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!ok) throw new Error("copy failed");
}

/**
 * Wordle-style end-of-gauntlet popup: total time, stats, per-puzzle times,
 * next-Hexle countdown and a share button.
 */
export default function HexleResults({ dateKey, times, stats, onClose, onReview, onHome }) {
  const [remaining, setRemaining] = useState(() => msUntilLocalMidnight());
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setRemaining(msUntilLocalMidnight()), 1000);
    return () => {
      clearInterval(id);
      clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (message) => {
    setToast(message);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2000);
  };

  const handleShare = async () => {
    const text = buildShareText(dateKey, times, `${window.location.origin}/hexle`);
    const isTouch = window.matchMedia?.("(pointer: coarse)").matches;
    if (isTouch && typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return; // user closed the share sheet
        // otherwise fall back to copying
      }
    }
    try {
      await copyText(text);
      showToast("Copied results to clipboard");
    } catch {
      showToast("Couldn't copy results");
    }
  };

  const total = totalTime(times);
  const slowest = Math.max(...times, 1);
  const hasHistoryAvg = stats.prevAvgPerPuzzle.some((a) => a !== null);

  const statTiles = [
    { label: "Played", value: stats.played },
    { label: "Current Streak", value: stats.currentStreak },
    { label: "Max Streak", value: stats.maxStreak },
    { label: "Best Time", value: stats.bestTotal == null ? "-" : formatTime(stats.bestTotal) },
    { label: "Avg Time", value: stats.avgTotal == null ? "-" : formatTime(stats.avgTotal) },
  ];

  return (
    <>
      <div className="overlayContainer hexleBackdrop" onClick={onClose}>
        <div className="overlayBox hexleBox" onClick={(e) => e.stopPropagation()}>
          <div className="hexleScroll">
            <h2 className="hexleTitle">Hexle #{getHexleNumber(dateKey)}</h2>
            <div className="hexleTotal">{formatTime(total)}</div>
            {stats.isPersonalBest && <div className="hexleBest">★ Personal best!</div>}

            <h3 className="hexleSection">Statistics</h3>
            <div className="hexleStats">
              {statTiles.map(({ label, value }) => (
                <div className="hexleStat" key={label}>
                  <div className="hexleStatValue">{value}</div>
                  <div className="hexleStatLabel">{label}</div>
                </div>
              ))}
            </div>

            <h3 className="hexleSection">Today&apos;s Times</h3>
            <div className="hexleRows">
              {DAILY_PUZZLES.map((puzzle, i) => {
                const color = difficultyColor(puzzle.difficulty);
                const avg = stats.prevAvgPerPuzzle[i];
                const diff = avg == null ? null : times[i] - avg;
                const showDiff = diff !== null && Math.abs(diff) >= 1000;
                return (
                  <button
                    key={puzzle.id}
                    className="hexleRow"
                    onClick={() => onReview(i)}
                    aria-label={`Review puzzle ${i + 1}`}
                  >
                    <HexIcon text={i + 1} color={color} size={28} fontSize="48" />
                    <span className="hexleBarTrack">
                      <span
                        className="hexleBar"
                        style={{
                          width: `${Math.max(8, (times[i] / slowest) * 100)}%`,
                          backgroundColor: color,
                        }}
                      />
                    </span>
                    <span className="hexleRowTime">{formatTime(times[i])}</span>
                    {hasHistoryAvg && (
                      <span
                        className="hexleRowDiff"
                        style={{ color: diff < 0 ? "#228B22" : "#c0392b" }}
                        title="Compared with your average"
                      >
                        {showDiff ? `${diff < 0 ? "-" : "+"}${formatTime(Math.abs(diff))}` : ""}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {hasHistoryAvg && <div className="hexleHint">+/- vs. your average</div>}

            <div className="hexleFooter">
              <div className="hexleNext">
                <div className="hexleNextLabel">Next Hexle</div>
                <div className="hexleNextTime">
                  {remaining > 0 ? formatCountdown(remaining) : "Ready!"}
                </div>
              </div>
              <div className="hexleDivider" />
              <button className="overlayButton hexleShare" onClick={handleShare}>
                Share <FiShare2 style={{ verticalAlign: "middle", marginLeft: 6 }} />
              </button>
            </div>

            <div className="hexleActions">
              <button className="overlayButton" onClick={() => onReview(null)}>
                Review
              </button>
              <button className="overlayButton" onClick={onHome}>
                Home
              </button>
            </div>
          </div>

          {/* Circular close button (matches the header popups) */}
          <button className="hexleClose" onClick={onClose} aria-label="Close results">
            <FiX color="#333" style={{ strokeWidth: "4" }} />
          </button>
        </div>
      </div>

      {toast && <div className="hexleToast">{toast}</div>}

      <style jsx>{`
        .hexleBackdrop {
          position: fixed;
        }
        .hexleBox {
          position: relative;
          box-sizing: border-box;
          /* leave room for the close button that sits 14px outside the card */
          width: min(440px, calc(100vw - 40px));
          padding: 16px 14px;
        }
        .hexleScroll {
          max-height: calc(90svh - 40px);
          overflow-y: auto;
          touch-action: pan-y;
          padding: 0 6px;
        }
        .hexleTitle {
          margin: 0;
          font-family: 'Press Start 2P', sans-serif;
          color: #06404b;
          font-size: 22px;
        }
        .hexleTotal {
          font-family: 'Press Start 2P', sans-serif;
          font-size: 40px;
          font-weight: bold;
          margin-top: 10px;
          color: #333;
        }
        .hexleBest {
          display: inline-block;
          margin-top: 8px;
          padding: 4px 10px;
          border-radius: 10px;
          background: #ffe173;
          color: #6b4f00;
          font-family: 'Press Start 2P', sans-serif;
          font-size: 12px;
          font-weight: bold;
        }
        .hexleSection {
          margin: 18px 0 8px;
          font-family: 'Press Start 2P', sans-serif;
          font-size: 13px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #06404b;
        }
        .hexleStats {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px 4px;
        }
        .hexleStat {
          flex: 0 0 30%;
          min-width: 0;
        }
        .hexleStatValue {
          font-family: 'Press Start 2P', sans-serif;
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }
        .hexleStatLabel {
          font-size: 11px;
          color: #555;
          margin-top: 2px;
        }
        .hexleRows {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .hexleRow {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 2px 4px;
          border: none;
          background: none;
          border-radius: 8px;
          cursor: pointer;
          font: inherit;
        }
        .hexleRow:hover {
          background: #eef6f8;
        }
        .hexleBarTrack {
          flex: 1;
          height: 18px;
          border-radius: 5px;
          background: #eef3f5;
          overflow: hidden;
          display: flex;
        }
        .hexleBar {
          display: block;
          height: 100%;
          border-radius: 5px;
          transition: width 0.6s ease;
        }
        .hexleRowTime {
          font-family: 'Press Start 2P', sans-serif;
          font-size: 14px;
          font-weight: bold;
          color: #333;
          min-width: 44px;
          text-align: right;
        }
        .hexleRowDiff {
          font-family: 'Press Start 2P', sans-serif;
          font-size: 11px;
          min-width: 48px;
          text-align: right;
        }
        .hexleHint {
          margin-top: 4px;
          font-size: 10px;
          color: #777;
          text-align: right;
        }
        .hexleFooter {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 18px;
        }
        .hexleNext {
          flex: 1;
          text-align: center;
        }
        .hexleNextLabel {
          font-family: 'Press Start 2P', sans-serif;
          font-size: 12px;
          text-transform: uppercase;
          color: #06404b;
        }
        .hexleNextTime {
          font-family: 'Press Start 2P', sans-serif;
          font-size: 22px;
          font-weight: bold;
          color: #333;
          margin-top: 4px;
        }
        .hexleDivider {
          width: 2px;
          align-self: stretch;
          background: #ddd;
        }
        .hexleShare {
          flex: 1;
          white-space: nowrap;
          background-color: #5a9cf2;
        }
        .hexleShare:hover {
          background-color: #4688e0;
        }
        .hexleActions {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-top: 18px;
          margin-bottom: 4px;
        }
        .hexleClose {
          position: absolute;
          top: -14px;
          right: -14px;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: #fff;
          border: 3px solid #333;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
        }
        .hexleToast {
          position: fixed;
          top: 70px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10001;
          background: #333;
          color: #fff;
          padding: 12px 16px;
          border-radius: 8px;
          font-family: 'Press Start 2P', sans-serif;
          font-size: 14px;
          font-weight: bold;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
          animation: popupFadeIn 0.2s ease forwards;
          pointer-events: none;
          white-space: nowrap;
        }
      `}</style>
    </>
  );
}
