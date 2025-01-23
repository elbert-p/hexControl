// app/puzzle-select/page.js

"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { HexGrid, Layout, Hexagon } from "react-hexgrid";
import ClipperLib from "clipper-lib";
import puzzles from "./../puzzleData";
// console.log(puzzles[5].mapData)

/** Difficulty → color mapping */
function difficultyColor(diff) {
  switch (diff) {
    case "easy":
      return "#c9e773"; // Easy color //d8ee99
    case "medium":
      return "#ffd188"; // Medium color
    case "hard":
      return "#ff8888"; // Hard color
    default:
      return "#eeeeee"; // Default color
  }
}

/** Generate a unique key for each hex based on its coordinates */
function hexKey(q, r, s) {
  return `${q},${r},${s}`;
}

/** Retrieve neighboring hex keys */
function getNeighborKeys(q, r, s) {
  const directions = [
    [1, 0, -1],
    [1, -1, 0],
    [0, -1, 1],
    [-1, 0, 1],
    [-1, 1, 0],
    [0, 1, -1],
  ];
  return directions.map(([dq, dr, ds]) => `${q + dq},${r + dr},${s + ds}`);
}

/** Convert hex coordinates to pixel positions (pointy-top) */
function hexToPixel(q, r, layout) {
  const { size } = layout;
  const { x: sizeX, y: sizeY } = size;
  const spacing = layout.spacing ?? 1;
  const originX = layout.origin?.x ?? 0;
  const originY = layout.origin?.y ?? 0;

  const px =
    spacing * sizeX * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r) + originX;
  const py = spacing * sizeY * ((3 / 2) * r) + originY;
  return { x: px, y: py };
}

/** Get the corners of a pointy-top hex */
function getHexCorners(q, r, layout) {
  const { size } = layout;
  const { x: sizeX, y: sizeY } = size;
  const spacing = layout.spacing ?? 1;
  const center = hexToPixel(q, r, layout);

  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 30; // pointy-top
    const angleRad = (Math.PI / 180) * angleDeg;
    corners.push({
      x: center.x + spacing * sizeX * Math.cos(angleRad),
      y: center.y + spacing * sizeY * Math.sin(angleRad),
    });
  }
  return corners;
}

/** Convert float coordinates to Clipper integer coordinates */
function floatToClipperPoints(corners, scale) {
  return corners.map((pt) => ({
    X: Math.round(pt.x * scale),
    Y: Math.round(pt.y * scale),
  }));
}

/** Convert Clipper paths to SVG path strings */
function clipperPathsToSvg(paths, scale) {
  return paths.map((path) => {
    if (!path.length) return "";
    let d = `M ${path[0].X / scale},${path[0].Y / scale}`;
    for (let i = 1; i < path.length; i++) {
      d += ` L ${path[i].X / scale},${path[i].Y / scale}`;
    }
    return d + " Z";
  });
}

/** Compute the inset outline for selected hexes */
function computeInsetOutline(cellKeys, layout, offsetDelta = -600) {
  if (!cellKeys || cellKeys.length === 0) return [];
  const SCALE = 1000;

  // Build polygons from cellKeys
  const polygons = cellKeys.map((ck) => {
    const [q, r, s] = ck.split(",").map(Number);
    const floatCorners = getHexCorners(q, r, layout);
    return floatToClipperPoints(floatCorners, SCALE);
  });

  // Union of polygons
  const clipper = new ClipperLib.Clipper();
  clipper.AddPaths(polygons, ClipperLib.PolyType.ptSubject, true);
  const unionSolution = new ClipperLib.Paths();
  clipper.Execute(
    ClipperLib.ClipType.ctUnion,
    unionSolution,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero
  );
  if (!unionSolution.length) return [];

  // Offset (inset)
  const co = new ClipperLib.ClipperOffset();
  co.AddPaths(
    unionSolution,
    ClipperLib.JoinType.jtRound,
    ClipperLib.EndType.etClosedPolygon
  );
  const offsetSolution = new ClipperLib.Paths();
  co.Execute(offsetSolution, offsetDelta);

  return clipperPathsToSvg(offsetSolution, SCALE);
}

/** Compute the bounding box for the entire grid */
function computePixelBounds(hexList, layout) {
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  for (let hx of hexList) {
    const corners = getHexCorners(hx.q, hx.r, layout);
    for (let c of corners) {
      if (c.x < minX) minX = c.x;
      if (c.x > maxX) maxX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.y > maxY) maxY = c.y;
    }
  }
  return { minX, maxX, minY, maxY };
}

/** Puzzle Select Component */
function HexGridSelector({ puzzles, completedPuzzles }) {
  const router = useRouter();

  // Refs to track initial hex and drag state
  const initialHexRef = useRef(null);
  const dragOccurredRef = useRef(false);
  const isCursorOverHexRef = useRef(false);

  // 1. Convert completed puzzle IDs to their corresponding hex keys
  const completedHexKeys = completedPuzzles
    .map((id) => {
      const puzzle = puzzles.find((p) => p.id === id);
      return puzzle ? hexKey(puzzle.q, puzzle.r, puzzle.s) : null;
    })
    .filter(Boolean); // Remove any null values

  // 2. Define startKey outside useState since startKey depends on puzzles
  const startKey = hexKey(puzzles[0].q, puzzles[0].r, puzzles[0].s);

  // 3. Initialize selectedCells with all completed puzzles or startKey if none
  const [selectedCells, setSelectedCells] = useState(() => {
    if (completedHexKeys.length > 0) {
      return new Set(completedHexKeys);
    } else {
      return new Set([startKey]);
    }
  });

  const [isDragging, setIsDragging] = useState(false);
  const [activeSelection, setActiveSelection] = useState(new Set());
    const [isCursorOverHex, setIsCursorOverHex] = useState(false);

  // Define layout parameters
  const layoutParams = {
    size: { x: 36, y: 36 },
    flat: false,
    spacing: 1,
    origin: { x: 0, y: 0 },
  };

  // Compute bounding box for the grid
  const bounds = computePixelBounds(puzzles, layoutParams);
  const margin = 20;
  const widthPx = bounds.maxX - bounds.minX + margin * 2;
  const heightPx = bounds.maxY - bounds.minY + margin * 2;
  const viewBox = `${bounds.minX - margin} ${bounds.minY - margin} ${widthPx} ${heightPx}`;

  // Define stroke widths and insets to match HexGridPuzzle component
  const hexStrokeWidth = 2.4 * 1.5;
  const selectionStrokeWidth = 3.6 * 1.5;
  const SCALE = 1000;
  const activeInset = -hexStrokeWidth * SCALE;
  const regionInset = -((hexStrokeWidth + selectionStrokeWidth) / 2) * SCALE;

  /** Handle mouse down on a hex */
function onHexMouseDown(q, r, s, e) {
  e.stopPropagation();
  const k = hexKey(q, r, s);
  initialHexRef.current = k;
  dragOccurredRef.current = false;

  if (selectedCells.has(k)) {
    setIsDragging(true);
    setActiveSelection(new Set(selectedCells));
  } else {
    // Check if the clicked cell is a neighbor to any selected cell
    const neighbors = getNeighborKeys(q, r, s);
    const isNeighbor = neighbors.some((neighbor) => selectedCells.has(neighbor));

    if (isNeighbor) {
      setIsDragging(true);
      // Add the clicked cell to the active selection
      const newSelection = new Set(selectedCells);
      newSelection.add(k);
      setActiveSelection(newSelection);
    }
  }
}

  /** Handle mouse enter on a hex */
  function onHexMouseEnter(q, r, s) {
    if (!isDragging) return;
    setIsCursorOverHex(true); // Update state indicating cursor is over a hex
    isCursorOverHexRef.current = true;
    
    const k = hexKey(q, r, s);

    // If the cursor enters a different hex, flag that a drag occurred
    if (initialHexRef.current && k !== initialHexRef.current) {
      dragOccurredRef.current = true;
    }

    if (selectedCells.has(k)) {
      // If the cell is already selected, activeSelection remains as selectedCells
      setActiveSelection(new Set(selectedCells));
      return;
    }

    // Check if the hex is adjacent to any selected cell
    const isAdjacent = [...selectedCells].some((cellK) =>
      getNeighborKeys(...cellK.split(",").map(Number)).includes(k)
    );

    if (isAdjacent) {
      // Create a new Set with selectedCells plus the current cell
      const newActive = new Set(selectedCells);
      newActive.add(k);
      setActiveSelection(newActive);
    } else {
      // If not adjacent, activeSelection remains as selectedCells
      setActiveSelection(new Set(selectedCells));
    }
  }

  /** Handle mouse up to finalize selection and navigate */
  function onMouseUp() {
    if (!isDragging) return;
    setIsDragging(false);

    // Determine which hex is newly added
    let newHex = null;
    for (let cell of activeSelection) {
      if (!selectedCells.has(cell)) {
        newHex = cell;
        break;
      }
    }

    if (newHex) {
      // Add the new hex to selectedCells
      setSelectedCells((prev) => new Set([...prev, newHex]));

      // Find the puzzle associated with the new hex
      const [q, r, s] = newHex.split(",").map(Number);
      const puzzleObj = puzzles.find(
        (p) => p.q === q && p.r === r && p.s === s
      );

      if (puzzleObj) {
        // Navigate to the puzzle's page
        router.push(`/puzzle/${puzzleObj.id}`);
      }
    }

    // Reset activeSelection
    setActiveSelection(new Set());
  }

  /** Handle hex click */
  function onHexClick(q, r, s) {
    const k = hexKey(q, r, s);
    const puzzleObj = puzzles.find((p) => hexKey(p.q, p.r, p.s) === k);
    const isCompleted = puzzleObj && completedPuzzles.includes(puzzleObj.id);

    // Only navigate if no drag occurred and the click started and ended on the same hex
    if (
      initialHexRef.current === k &&
      !dragOccurredRef.current &&
      isCompleted
    ) {
      router.push(`/puzzle/${puzzleObj.id}`);
    }

    // Reset the refs after click
    initialHexRef.current = null;
    dragOccurredRef.current = false;
  }

  // Global mouse up handler
  useEffect(() => {
    if (!isDragging) return;
    const handleUp = () => onMouseUp();
    window.addEventListener("mouseup", handleUp);
    return () => window.removeEventListener("mouseup", handleUp);
  }, [isDragging, activeSelection, selectedCells]);

  useEffect(() => {
    isCursorOverHexRef.current = isCursorOverHex;
  }, [isCursorOverHex]);

  /** Compute outlines */
  const regionPaths = computeInsetOutline(
    [...selectedCells],
    layoutParams,
    regionInset
  );

  const activePaths = computeInsetOutline(
    [...activeSelection],
    layoutParams,
    activeInset
  );

  const clusterOutlinePaths = computeInsetOutline(
    puzzles.map(hex => hexKey(hex.q, hex.r, hex.s)),
    layoutParams, -activeInset
  );

  /** Handle mouse leaving the grid area */
  function onGridMouseLeave() {
    if (isDragging) {
      setActiveSelection(new Set(selectedCells));
    }
  }

  function onHexMouseLeave(q, r, s) {
    if (!isDragging) return;
    setIsCursorOverHex(false); // Update state indicating cursor is not over a hex
    isCursorOverHexRef.current = false;
  
    // Use a timeout to allow onHexMouseEnter to trigger if moving to another hex
    setTimeout(() => {
      if (!isCursorOverHexRef.current) {
        setActiveSelection(new Set(selectedCells));
      }
    }, 50); // 50ms delay
  }
  

  return (
    <div style={{ display: "inline-block", userSelect: "none" }}>
      <HexGrid
        width={widthPx}
        height={heightPx}
        viewBox={viewBox}
        onMouseLeave={onGridMouseLeave} // Add onMouseLeave handler
      >
        <Layout {...layoutParams}>
          {puzzles.map((hex) => {
            const k = hexKey(hex.q, hex.r, hex.s);
            const fill = difficultyColor(hex.difficulty);

            return (
              <Hexagon
                key={k}
                q={hex.q}
                r={hex.r}
                s={hex.s}
                onMouseDown={(e) => onHexMouseDown(hex.q, hex.r, hex.s, e)}
                onMouseEnter={() => onHexMouseEnter(hex.q, hex.r, hex.s)}
                onMouseLeave={() => onHexMouseLeave(hex.q, hex.r, hex.s)}
                onClick={() => onHexClick(hex.q, hex.r, hex.s)}
                style={{
                  fill,
                  stroke: "#fff",
                  strokeWidth: hexStrokeWidth,
                  cursor: "pointer",
                }}
              >
                {/* Puzzle ID text */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="27"
                  fontFamily="'Press Start 2P', sans-serif" // Blocky font
                  stroke="none"
                  fill="#fff"
                  fontWeight="900"
                  style={{
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  {hex.id}
                </text>
              </Hexagon>
            );
          })}
        </Layout>

        {/* Final region outline */}
        {regionPaths.map((d, i) => (
          <path
            key={`region-${i}`}
            d={d}
            fill="none"
            stroke="#228B22" // Consistent color for region outline
            strokeWidth={selectionStrokeWidth}
          />
        ))}

        {/* Active selection outline */}
        {activePaths.map((d, i) => (
          <path
            key={`active-${i}`}
            d={d}
            fill="none"
            stroke="#228B22" // Consistent color for active selection #006600
            strokeWidth={hexStrokeWidth}
          />
        ))}

        {/* Cluster outline around all hexes */}
        {clusterOutlinePaths.map((d, idx) => (
          <path
            key={`cluster-outline-${idx}`}
            d={d}
            fill="none"
            stroke="#ffdf88"
            strokeWidth={ hexStrokeWidth }
          />
        ))}
      </HexGrid>
    </div>
  );
}

export default function PuzzleSelectPage() {
  const router = useRouter();

  // State to track completed puzzles and loading status
  const [completedPuzzles, setCompletedPuzzles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load completed puzzles from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("completedPuzzles")) || [];
      setCompletedPuzzles(stored);
    } catch (error) {
      console.error("Failed to parse completedPuzzles from localStorage:", error);
      setCompletedPuzzles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Perform redirect if no puzzles are completed.
   * Using useLayoutEffect to ensure the redirect happens before paint.
   */
  useLayoutEffect(() => {
    if (!isLoading && completedPuzzles.length === 0 && puzzles.length > 0) {
      const firstPuzzle = puzzles[0];
      router.push(`/puzzle/${firstPuzzle.id}`);
    }
  }, [isLoading, completedPuzzles, puzzles, router]);

  // If still loading, show loading screen
//   if (isLoading) {
//     return (
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "center",
//           alignItems: "center",
//           height: "100vh",
//           backgroundColor: "#c6e2e9", // Same background as puzzle page
//         }}
//       >
//         <p>Loading...</p>
//       </div>
//     );
//   }

  // If no completed puzzles, do not render HexGridSelector (redirect is in progress)
  if (completedPuzzles.length === 0) {
    return null; // Or a placeholder if needed
  }

  // Render the HexGridSelector only if there are completed puzzles
  return (
    <main
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#c6e2e9", // Same background as puzzle page
      }}
    >
      <HexGridSelector puzzles={puzzles} completedPuzzles={completedPuzzles} />
    </main>
  );
}
