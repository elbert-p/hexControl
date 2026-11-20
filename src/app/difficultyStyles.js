// src/app/difficultyStyles.js
// Shared difficulty → color lookups used by level select, puzzle pages and the daily Hexle.

/** Puzzle fill/outline colors for each difficulty. */
export const colorScheme = {
  easy: {
    fill:    ["#b7d65c", "#7fb3ff"],
    outline: ["#165214", "#1c5aa6"],
  },
  intermediate: {
    fill:    ["#ffda54", "#dba86c"],
    outline: ["#b07000", "#5c3b1a"],
  },
  medium: {
    fill:    ["#ffc76e", "#7ea2ff"],
    outline: ["#b05c00", "#003b8b"],
  },
  hard: {
    fill:    ["#ff8888", "#88f"],
    outline: ["#700000", "#00008B"],
  },
  extreme: {
    fill:    ["#ff8888", "#d273ff"],
    outline: ["#8B0000", "#5a0070"],
  },
};

/** Difficulty → hex tile color on the level select map. */
export function difficultyColor(diff) {
  switch (diff) {
    case "easy":
      return "#c9e773"; //d8ee99
    case "intermediate":
      return "#ffe173"; //ffdf88
    case "medium":
      return "#ffd188";
    case "hard":
      return "#ff8888";
    case "extreme":
      return "#d580ff";
    default:
      return "#eeeeee";
  }
}
