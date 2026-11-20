// app/hexle/page.js — the daily Hexle gauntlet
"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiClock, FiPause, FiPlay } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import PuzzleHeader from "../../components/PuzzleHeader";
import HexPuzzleWrapper from "../../components/HexPuzzleWrapper";
import HexIcon from "../../components/HexIcon";
import HexleResults from "../../components/HexleResults";
import CenteredStage from "../../components/CenteredStage";
import { colorScheme, difficultyColor } from "../difficultyStyles";
import {
  DAILY_COUNT,
  DAILY_PUZZLES,
  currentDailyIndex,
  formatTime,
  getCachedDailyMap,
  getDailyMap,
  getHexleNumber,
  getHexleStats,
  getTodayKey,
  isDailyDone,
  loadDailyState,
  loadHistory,
  prefetchDailyMaps,
  recordCompletion,
  saveDailyState,
  totalTime,
} from "./daily";

// The page re-renders every clock tick; memoizing keeps the puzzle board from re-rendering too.
const PuzzleBoard = memo(HexPuzzleWrapper);

const solvedCount = (s) => s.solutions.filter(Boolean).length;

const TICK_MS = 1000;
// Ignore gaps bigger than this between ticks (e.g. the computer slept with the tab open).
const MAX_TICK_MS = 5000;
// Only ask the player to press Play if they actually watched the generating screen this long.
const READY_PROMPT_AFTER_MS = 1500;

/**
 * Row of 5 numbered hexes (centered) with the clock on the left and pause button on the right.
 * Each hex is filled with its difficulty color; finished ones get a dark green outline,
 * unfinished ones a white outline, and the current one a thicker dark green outline.
 */
function ProgressStrip({ solutions, displayIndex, mode, totalMs, onSelect, canPause, paused, onTogglePause }) {
  const reviewing = mode === "review";
  return (
    <div className="strip">
      <div className={`clock ${reviewing ? "done" : ""}`} aria-label="Total time">
        <FiClock className="clockIcon" />
        {formatTime(totalMs)}
      </div>
      <div className="pips">
        {DAILY_PUZZLES.map((puzzle, i) => {
          const solved = !!solutions[i];
          const isCurrent = i === displayIndex;
          const icon = (
            <HexIcon
              text={i + 1}
              color={difficultyColor(puzzle.difficulty)}
              strokeColor={isCurrent || solved ? "#228B22" : "#fff"}
              strokeWidth={isCurrent ? "16" : "8"}
              textColor="#fff"
              size={34}
              fontSize="46"
            />
          );
          return reviewing ? (
            <button
              key={puzzle.id}
              className={`pip ${isCurrent ? "current" : ""}`}
              onClick={() => onSelect(i)}
              aria-label={`Review puzzle ${i + 1}`}
            >
              {icon}
            </button>
          ) : (
            <span key={puzzle.id} className={`pip ${isCurrent ? "current" : ""}`}>
              {icon}
            </span>
          );
        })}
      </div>
      <div className="side">
        {canPause && (
          <button
            className="pauseButton"
            onClick={onTogglePause}
            aria-label={paused ? "Resume" : "Pause"}
            title={paused ? "Resume (P)" : "Pause (P)"}
          >
            {paused ? <FiPlay /> : <FiPause />}
          </button>
        )}
      </div>

      <style jsx>{`
        .strip {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
          align-items: center;
          column-gap: 14px;
          padding: 10px 10px 0;
          user-select: none;
        }
        .pips {
          display: flex;
          gap: 6px;
        }
        .pip {
          display: flex;
          background: none;
          border: none;
          padding: 0;
          transition: transform 0.2s ease;
        }
        button.pip {
          cursor: pointer;
        }
        .pip.current {
          transform: scale(1.12);
        }
        .side {
          justify-self: start;
          display: flex;
          align-items: center;
          gap: 10px;
          white-space: nowrap;
        }
        .clock {
          justify-self: end;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Press Start 2P', sans-serif;
          font-size: 20px;
          font-weight: bold;
          color: #333;
        }
        .clock.done {
          color: #228b22;
        }
        .clock :global(.clockIcon) {
          font-size: 24px;
        }
        .pauseButton {
          display: flex;
          align-items: center;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          font-size: 26px;
          color: #333;
        }
        @media (max-width: 480px) {
          .strip {
            column-gap: 8px;
          }
          .pips {
            gap: 4px;
          }
          .pip :global(svg) {
            width: 28px;
            height: 28px;
          }
          .clock {
            font-size: 16px;
          }
          .clock :global(.clockIcon) {
            display: none;
          }
          .pauseButton {
            font-size: 22px;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Stands in for the board while a puzzle isn't playable yet. The clock is paused the whole
 * time; for a puzzle that had to be generated, play only starts when the player presses Play.
 */
function PuzzleGate({ index, difficulty, status, onPlay, onRetry }) {
  const number = index + 1;
  const color = difficultyColor(difficulty);
  const content = {
    loading: { title: `Loading puzzle ${number}…`, body: null },
    generating: {
      title: `Generating puzzle ${number}…`,
      body: "Nobody has played this one yet, so it's being built on your device. This can take a minute or two.",
    },
    ready: { title: `Puzzle ${number} is ready!`, body: "Start whenever you like." },
    error: { title: `Couldn't generate puzzle ${number}.`, body: "Check your connection and try again." },
    paused: { title: "Paused", body: "The puzzle is hidden until you resume." },
  }[status];

  return (
    <div className="gateWrap">
      <div className={`gateCard ${status === "ready" || status === "paused" ? "ready" : ""}`}>
        <div className={status === "loading" || status === "generating" ? "gateSpin" : "gatePop"}>
          <HexIcon
            text={number}
            color={color}
            strokeColor={status === "ready" ? "#228B22" : "#333"}
            strokeWidth={status === "ready" ? "10" : "8"}
            size={64}
            fontSize="48"
          />
        </div>
        <h2 className="gateTitle">{content.title}</h2>
        {content.body && <p className="gateBody">{content.body}</p>}
        {status !== "loading" && (
          <div className="gatePaused">
            <FiPause /> Clock paused
          </div>
        )}
        {(status === "ready" || status === "paused") && (
          <button className="overlayButton gateButton" onClick={onPlay} autoFocus>
            <FiPlay style={{ verticalAlign: "middle", marginRight: 8 }} />
            {status === "paused" ? "Resume" : "Play"}
          </button>
        )}
        {status === "error" && (
          <button className="overlayButton gateButton" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>

      <style jsx>{`
        .gateWrap {
          flex: 1;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          box-sizing: border-box;
        }
        .gateCard {
          width: min(380px, calc(100vw - 40px));
          box-sizing: border-box;
          background: #fff;
          border: 6px solid #fff;
          border-radius: 20px;
          padding: 26px 22px;
          text-align: center;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          user-select: none;
        }
        .gateCard.ready {
          border-color: #228b22;
          animation: popupFadeIn 0.35s ease forwards;
        }
        .gateTitle {
          margin: 0;
          font-family: 'Press Start 2P', sans-serif;
          font-size: 20px;
          color: #06404b;
        }
        .gateBody {
          margin: 0;
          font-family: 'Press Start 2P', sans-serif; /* same as the How To Play text */
          font-size: 16px;
          line-height: 1.5;
          color: #555;
        }
        .gatePaused {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'Press Start 2P', sans-serif;
          font-size: 13px;
          font-weight: bold;
          color: #b05c00;
        }
        .gateButton {
          margin-top: 4px;
          font-size: 22px;
          padding: 12px 34px;
        }
        .gateSpin {
          animation: gateSpin 1.6s ease-in-out infinite;
        }
        .gatePop {
          animation: popupFadeIn 0.4s ease forwards;
        }
        @keyframes gateSpin {
          0% {
            transform: rotate(0deg) scale(1);
          }
          50% {
            transform: rotate(180deg) scale(0.85);
          }
          100% {
            transform: rotate(360deg) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

export default function HexlePage() {
  const router = useRouter();

  // Everything date-dependent is set on mount (never during SSR, which has no local timezone).
  const [state, setState] = useState(null);
  const stateRef = useRef(null);
  const [maps, setMaps] = useState({});
  const [genError, setGenError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [mode, setMode] = useState("play"); // "play" | "review"
  const [solving, setSolving] = useState(false); // between solve and end of fill animation
  const [showResults, setShowResults] = useState(false);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  // Shown instead of the board until a puzzle is available: { index, status } where status is
  // "loading" (quick fetch), "generating" (built on this device) or "ready" (waiting for Play).
  const [gate, setGate] = useState(null);

  // Account sync: save on solve / leave, and adopt progress pulled from another device.
  const { notifyLocalDataUpdated, localDataVersion } = useAuth();
  const notifyRef = useRef(notifyLocalDataUpdated);
  notifyRef.current = notifyLocalDataUpdated;

  const flushRef = useRef(null);
  const displayIndexRef = useRef(0);
  displayIndexRef.current = displayIndex;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const applyStateRef = useRef(null);

  /** Single write path: update ref + localStorage + React state together. */
  const updateState = useCallback((updater) => {
    const next = updater(stateRef.current);
    if (next === stateRef.current) return;
    // Never save over progress that's further along (e.g. just pulled from the account
    // after being played on another device) — switch to it instead.
    const stored = loadDailyState(next.date);
    if (solvedCount(stored) > solvedCount(next)) {
      applyStateRef.current?.(stored);
      return;
    }
    stateRef.current = next;
    saveDailyState(next);
    setState(next);
  }, []);

  /** Show a loaded progress state (on open, or when another device's progress arrives). */
  const applyState = useCallback((loaded) => {
    stateRef.current = loaded;
    setState(loaded);
    setSolving(false);
    if (isDailyDone(loaded)) {
      if (!loadHistory()[loaded.date]) recordCompletion(loaded.date, loaded.times); // backfill
      setMode("review");
      setDisplayIndex(0);
      setShowResults(true);
    } else {
      setMode("play");
      setDisplayIndex(currentDailyIndex(loaded));
    }
  }, []);

  applyStateRef.current = applyState;

  // ── Load today's progress ──
  useEffect(() => {
    const todayKey = getTodayKey();
    applyState(loadDailyState(todayKey));

    // Use whatever is cached right away, and generate the rest in the background.
    const cached = {};
    DAILY_PUZZLES.forEach((p) => {
      const map = getCachedDailyMap(todayKey, p.id);
      if (map) cached[p.id] = map;
    });
    setMaps(cached);
    prefetchDailyMaps(todayKey);
  }, [applyState]);

  // ── Progress pulled from the account (played further on another device) ──
  useEffect(() => {
    const current = stateRef.current;
    if (!current) return;
    const stored = loadDailyState(current.date);
    if (solvedCount(stored) > solvedCount(current)) applyState(stored);
  }, [localDataVersion, applyState]);

  // ── Make sure the displayed puzzle's map is (being) generated ──
  const dateKey = state?.date;
  const puzzle = DAILY_PUZZLES[displayIndex];
  const mapData = maps[puzzle.id] ?? null;

  useEffect(() => {
    if (!dateKey || mapData) return;
    let cancelled = false;
    const index = displayIndex;
    let generatingSince = null;
    setGate({ index, status: "loading" });
    getDailyMap(dateKey, puzzle.id, {
      onGenerating: () => {
        if (cancelled) return;
        generatingSince = Date.now();
        setGate({ index, status: "generating" });
      },
    })
      .then((map) => {
        if (cancelled) return;
        setMaps((prev) => ({ ...prev, [puzzle.id]: map }));
        // A puzzle the player actually waited on gets a "ready → Play" step;
        // a quick fetch (or a near-instant generation) just starts.
        const waited = generatingSince !== null && Date.now() - generatingSince >= READY_PROMPT_AFTER_MS;
        setGate(waited ? { index, status: "ready" } : null);
      })
      .catch((err) => {
        console.error("Hexle generation failed:", err);
        if (!cancelled) setGenError(err);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey, puzzle.id, mapData, retryCount]);

  const gateStatus =
    mode !== "play" ? null : gate?.index === displayIndex ? gate.status : mapData ? null : "loading";

  // Let a player in another tab know their puzzle is ready.
  useEffect(() => {
    if (gateStatus !== "ready") return;
    const previous = document.title;
    document.title = "Puzzle ready! · Hex Control";
    return () => {
      document.title = previous;
    };
  }, [gateStatus]);

  // ── Pause when the tab is hidden / closed ──
  useEffect(() => {
    const onVisibility = () => {
      const isVisible = document.visibilityState === "visible";
      if (!isVisible) {
        flushRef.current?.(); // record time up to now, then save to the account
        notifyRef.current?.();
      }
      setVisible(isVisible);
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // ── The clock ── (paused while a puzzle loads / generates / waits for Play)
  const canPause = !!state && mode === "play" && !solving && !!mapData && gateStatus === null;
  const isPaused = canPause && paused;
  const running = canPause && !paused && visible;

  // P toggles pause.
  useEffect(() => {
    if (!canPause) return;
    const onKey = (e) => {
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canPause]);

  useEffect(() => {
    if (!running) return;
    const index = displayIndex; // captured so a late flush never credits the next puzzle
    let last = performance.now();

    const flush = () => {
      const now = performance.now();
      const delta = Math.min(now - last, MAX_TICK_MS);
      last = now;
      if (delta <= 0) return;
      updateState((s) => {
        if (s.solutions[index]) return s;
        const times = [...s.times];
        times[index] = Math.round(times[index] + delta);
        return { ...s, times };
      });
    };

    flushRef.current = flush;
    const interval = setInterval(flush, TICK_MS);
    window.addEventListener("pagehide", flush);
    return () => {
      clearInterval(interval);
      window.removeEventListener("pagehide", flush);
      flush(); // navigating home, hiding the tab, or solving
      if (flushRef.current === flush) flushRef.current = null;
    };
  }, [running, displayIndex, updateState]);

  // Save to the account when leaving the page (declared after the clock so its final flush runs first).
  useEffect(() => () => notifyRef.current?.(), []);

  // ── Puzzle callbacks (stable so the memoized board doesn't re-render each tick) ──
  const handleSolved = useCallback(
    (selections) => {
      const index = displayIndexRef.current;
      flushRef.current?.(); // stop the clock at the exact moment of solving
      updateState((s) => {
        if (s.solutions[index]) return s;
        const solutions = [...s.solutions];
        solutions[index] = selections;
        return { ...s, solutions, draft: null };
      });
      const latest = stateRef.current;
      if (isDailyDone(latest)) recordCompletion(latest.date, latest.times);
      setSolving(true);
      notifyRef.current?.(); // save progress (and stats, when finished) to the account
    },
    [updateState]
  );

  // Bound to the puzzle index, so a duplicate call (StrictMode) can't skip a puzzle.
  const handleAnimationEnd = useMemo(
    () => () => {
      const index = displayIndex;
      setSolving(false);
      if (index >= DAILY_COUNT - 1) {
        setMode("review");
        setShowResults(true);
      } else {
        setDisplayIndex((prev) => (prev === index ? index + 1 : prev));
      }
    },
    [displayIndex]
  );

  const handlePuzzleStateChange = useCallback(
    ({ selections }) => {
      if (modeRef.current !== "play") return;
      const index = displayIndexRef.current;
      updateState((s) =>
        s.solutions[index] ? s : { ...s, draft: { index, selections } }
      );
    },
    [updateState]
  );

  // Saved regions to start the board with: the answer when reviewing, the draft when resuming.
  const boardKey = `${dateKey}-${displayIndex}-${mode}-${mapData ? "ready" : "loading"}`;
  const initialSelections = useMemo(() => {
    const s = stateRef.current;
    if (!s) return undefined;
    if (mode === "review") return s.solutions[displayIndex] ?? undefined;
    return s.draft?.index === displayIndex ? s.draft.selections : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardKey]);

  const stats = useMemo(
    () => (showResults && dateKey ? getHexleStats(dateKey) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showResults, dateKey, localDataVersion]
  );

  if (!state) return null;

  const reviewIndex = (i) => {
    setMode("review");
    setShowResults(false);
    if (i !== null && i !== undefined) setDisplayIndex(i);
  };

  return (
    <div
      style={{
        width: "100dvw",
        height: "100svh",
        backgroundColor: "#c6e2e9",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <PuzzleHeader title={`Hexle #${getHexleNumber(state.date)}`} />

      {/* The puzzle stays centered exactly as on a normal level; the strip above and the
          Results button below only move it if they'd otherwise touch it. */}
      <CenteredStage
        boxSelector=".dynamicWrapper, .gateCard"
        top={
          <ProgressStrip
            solutions={state.solutions}
            displayIndex={displayIndex}
            mode={mode}
            totalMs={totalTime(state.times)}
            onSelect={setDisplayIndex}
            canPause={canPause}
            paused={isPaused}
            onTogglePause={() => setPaused((p) => !p)}
          />
        }
        below={
          mode === "review" ? (
            <button
              className="overlayButton"
              style={{ visibility: showResults ? "hidden" : "visible" }}
              onClick={() => setShowResults(true)}
            >
              Results
            </button>
          ) : null
        }
      >
        {gateStatus || (genError && !mapData) ? (
          <PuzzleGate
            index={displayIndex}
            difficulty={puzzle.difficulty}
            status={genError && !mapData ? "error" : gateStatus}
            onPlay={() => setGate(null)}
            onRetry={() => {
              setGenError(null);
              setRetryCount((n) => n + 1);
            }}
          />
        ) : (
          <>
            {/* Hidden (not unmounted) while paused, so undo history and layout are kept. */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                visibility: isPaused ? "hidden" : "visible",
              }}
            >
              <PuzzleBoard
                key={boardKey}
                mapData={mapData}
                colorToWin={puzzle.colorToWin}
                colorScheme={colorScheme[puzzle.difficulty]}
                regionSize={puzzle.regionSize}
                sizeMultiplier={puzzle.sizeMultiplier}
                puzzleId={`Hexle ${displayIndex + 1}`}
                onSolved={handleSolved}
                onSolvedAnimationEnd={handleAnimationEnd}
                onPuzzleStateChange={handlePuzzleStateChange}
                initialSelections={initialSelections}
                readOnly={mode === "review" || solving || isPaused}
              />
            </div>
            {isPaused && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 3,
                }}
              >
                <PuzzleGate
                  index={displayIndex}
                  difficulty={puzzle.difficulty}
                  status="paused"
                  onPlay={() => setPaused(false)}
                />
              </div>
            )}
          </>
        )}
      </CenteredStage>

      {showResults && stats && (
        <HexleResults
          dateKey={state.date}
          times={state.times}
          stats={stats}
          onClose={() => setShowResults(false)}
          onReview={reviewIndex}
          onHome={() => router.push("/puzzle-select")}
        />
      )}
    </div>
  );
}
