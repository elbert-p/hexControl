// src/components/HexIcon.js
"use client";

import React from "react";

/** Small pointy-top hexagon icon with optional centered blocky text. */
export default function HexIcon({
  text,
  color = "#ffdf88",
  strokeColor = "#333",
  size = 40,
  textColor = "#333",
  fontSize = "18",
  strokeWidth = "8",
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ verticalAlign: "middle", flexShrink: 0 }}
      overflow="visible"
    >
      <polygon
        points="50,0 93,25 93,75 50,100 7,75 7,25"
        fill={color}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {text !== undefined && text !== null && text !== "" && (
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
}
