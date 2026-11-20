// src/components/DailyButton.js
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiCalendar, FiCheckCircle } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import {
  DAILY_COUNT,
  formatTime,
  getHexleNumber,
  getHexleStats,
  getTodayKey,
  hasStartedDaily,
  isDailyDone,
  loadDailyState,
  prefetchDailyMaps,
  totalTime,
} from "../app/hexle/daily";

/** Prominent Level Select banner for today's Hexle: play → continue → complete. */
export default function DailyButton() {
  const router = useRouter();
  const { localDataVersion } = useAuth();
  const [info, setInfo] = useState(null);

  useEffect(() => {
    const todayKey = getTodayKey();
    const state = loadDailyState(todayKey);
    setInfo({
      number: getHexleNumber(todayKey),
      done: isDailyDone(state),
      started: hasStartedDaily(state),
      solved: state.solutions.filter(Boolean).length,
      total: totalTime(state.times),
      streak: getHexleStats(todayKey).currentStreak,
    });
    // Warm up today's puzzles so they're ready by the time the player clicks.
    prefetchDailyMaps(todayKey);
  }, [localDataVersion]);

  if (!info) return null;

  const { number, done, started, solved, total, streak } = info;
  const title = done
    ? `Hexle #${number} Complete`
    : started
    ? `Continue Hexle #${number}`
    : `Daily Hexle #${number}`;
  const subtitle = done
    ? `${formatTime(total)}${streak >= 2 ? ` · 🔥 ${streak} day streak` : ""}`
    : started
    ? `${formatTime(total)} · ${solved}/${DAILY_COUNT} solved`
    : `${DAILY_COUNT} puzzles · 1 clock`;

  return (
    <>
      <button
        className={`dailyButton ${done ? "done" : started ? "" : "fresh"}`}
        onClick={() => router.push("/hexle")}
      >
        <span className="dailyIcon">{done ? <FiCheckCircle /> : <FiCalendar />}</span>
        <span className="dailyText">
          <span className="dailyTitle">{title}</span>
          <span className="dailySubtitle">{subtitle}</span>
        </span>
      </button>

      <style jsx>{`
        .dailyButton {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 22px;
          border-radius: 14px;
          border: 4px solid #fff;
          background-color: #a3bf56;
          color: #fff;
          cursor: pointer;
          font-family: sans-serif;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
          transition: background-color 0.3s ease, transform 0.15s ease;
          user-select: none;
        }
        .dailyButton:hover {
          background-color: #8fae45;
        }
        .dailyButton:active {
          transform: scale(0.97);
        }
        .dailyButton.fresh {
          animation: dailyPulse 1.8s ease-in-out infinite;
        }
        .dailyButton.done {
          background-color: #fff;
          border-color: #228b22;
          color: #228b22;
        }
        .dailyButton.done:hover {
          background-color: #f1f9f1;
        }
        .dailyIcon {
          display: flex;
          font-size: 30px;
        }
        .dailyText {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          text-align: left;
        }
        .dailyTitle {
          font-size: 18px;
          font-weight: bold;
        }
        .dailySubtitle {
          font-size: 12px;
          opacity: 0.9;
        }
        @keyframes dailyPulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.04);
          }
        }
        @media (max-width: 600px) {
          .dailyButton {
            padding: 8px 16px;
            gap: 10px;
          }
          .dailyIcon {
            font-size: 24px;
          }
          .dailyTitle {
            font-size: 15px;
          }
          .dailySubtitle {
            font-size: 11px;
          }
        }
      `}</style>
    </>
  );
}
