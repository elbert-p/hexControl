// app/puzzle-select/page.js

"use client";

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { HexGrid, Layout, Hexagon } from "react-hexgrid";
import ClipperLib from "clipper-lib";
import puzzles from "./../puzzleData";
import PuzzleHeader  from "../../components/PuzzleHeader";
import { useAuth } from "../../context/AuthContext";
// import InstallPrompt from '../../components/InstallPrompt';

// console.log(puzzles[5].mapData)

const CURRENT_VERSION = 4;
// migrationLog[version] can have { removed?: string[], moved?: Record<string,string> }
const migrationLog = {
  1: { removed: ["4a", "3a"] },
  2: { removed: ["8"] },
  // Version 3 updated the "puzzleCompletionCounts" localStorage item
  // Example: when going from v4 ➜ v5 we renamed puzzle 4a → 6
  4: { moved: { "7a": "10", "10": "7a", "9": "11" } },
};

function collectMigrationActions(fromVersion, toVersion) {
  const removed = new Set();
  const moved   = {};               // { oldId: newId }

  for (let v = fromVersion + 1; v <= toVersion; v++) {
    const entry = migrationLog[v];
    if (!entry) continue;

    entry.removed?.forEach(id => removed.add(id));
    Object.assign(moved, entry.moved);   // later versions overwrite earlier ones
  }
  return { removed, moved };
}

function applyMigrations({ puzzles, counts }, removed, moved) {
  /* ---------- completions array ---------- */
  puzzles = [...new Set(puzzles.map(id => moved[id] ?? id))]
            .filter(id => !removed.has(id));

  /* ---------- completion‑count object ---------- */
  if (counts) {
    const newCounts = {};

    for (const [id, cnt] of Object.entries(counts)) {
      const dest = moved[id] ?? id;          // rename if needed
      newCounts[dest] = (newCounts[dest] || 0) + cnt;
    }

    removed.forEach(id => delete newCounts[id]); // forget any obsolete ids
    counts = newCounts;
  }

  return { puzzles, counts };
}


/** Difficulty → color mapping */
function difficultyColor(diff) {
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

  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateContainerSize();
    window.addEventListener("resize", updateContainerSize);
    return () => window.removeEventListener("resize", updateContainerSize);
  }, []);

  // Refs to track initial hex and drag state
  const initialHexRef = useRef(null);
  const dragOccurredRef = useRef(false);

  // 1. Convert completed puzzle IDs to their corresponding hex keys
  // const completedHexKeys = completedPuzzles
  //   .map((id) => {
  //     const puzzle = puzzles.find((p) => p.id === id);
  //     return puzzle ? hexKey(puzzle.q, puzzle.r, puzzle.s) : null;
  //   })
  //   .filter(Boolean); // Remove any null values
  const completedHexKeys = useMemo(() => {
    return completedPuzzles
      .map((id) => {
        const puzzle = puzzles.find((p) => p.id === id);
        return puzzle ? hexKey(puzzle.q, puzzle.r, puzzle.s) : null;
      })
      .filter(Boolean);
  }, [completedPuzzles, puzzles]);

  // gate the “?” puzzle until these IDs are in completedPuzzles
  const prereqs = ["6","7","9","11","13"];
  const visiblePuzzles = useMemo(
    () =>
      puzzles.filter(
        p =>
          p.id !== "?" ||
          completedPuzzles.includes("?") ||
          prereqs.every(id => completedPuzzles.includes(id))
      ),
    [puzzles, completedPuzzles]
  );

  

  // 2. Define startKey outside useState since startKey depends on puzzles
  // const startKey = hexKey(puzzles[0].q, puzzles[0].r, puzzles[0].s);

  // 3. Initialize selectedCells with all completed puzzles or startKey if none
  // const [selectedCells, setSelectedCells] = useState(() => {
  //   if (completedHexKeys.length > 0) {
  //     return new Set(completedHexKeys);
  //   } else {
  //     return new Set([startKey]);
  //   }
  // });
  // If you do need a fallback
  const finalKeys = completedHexKeys.length > 0 
  ? completedHexKeys 
  : [hexKey(puzzles[0].q, puzzles[0].r, puzzles[0].s)];

  const selectedCells = new Set(finalKeys);
  

  const [isDragging, setIsDragging] = useState(false);
  const [activeSelection, setActiveSelection] = useState(new Set([]));

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

  const scaleFactor =
  containerSize.width && containerSize.height
    ? Math.min(1, containerSize.width / widthPx, containerSize.height / heightPx)
    : 1

  // Use the container size if available; otherwise, fallback to the computed dimensions
  const hexGridWidth = widthPx * scaleFactor;
  const hexGridHeight = heightPx * scaleFactor;
  // console.log(containerSize, scaleFactor)

  // Define stroke widths and insets to match HexGridPuzzle component
  const hexStrokeWidth = 3.6 * 1.5;
  const selectionStrokeWidth = 3.6 * 1.5;
  const activeSelectionStrokeWidth = 4.2 * 1.5;
  const SCALE = 1000;
  const activeInset = -((hexStrokeWidth + activeSelectionStrokeWidth) / 2) * SCALE;
  const outline = hexStrokeWidth * SCALE;
  const regionInset = -((hexStrokeWidth + selectionStrokeWidth) / 2) * SCALE;

  /** Handle mouse down on a hex */
function onHexMouseDown(q, r, s, e) {
  e.stopPropagation();
  const k = hexKey(q, r, s);
  initialHexRef.current = k;
  dragOccurredRef.current = false;

  if (selectedCells.has(k)) {
    setIsDragging(true);
    setActiveSelection(new Set([k]));
  } else {
    // Check if the clicked cell is a neighbor to any selected cell
    const neighbors = getNeighborKeys(q, r, s);
    const isNeighbor = neighbors.some((neighbor) => selectedCells.has(neighbor));
    
    if (isNeighbor) {
      setIsDragging(true);
      setActiveSelection(new Set([k]));
    }
  }
}

  /** Handle mouse enter on a hex */
  function onHexMouseEnter(q, r, s, e) {
    if (!isDragging) return;
    const k = hexKey(q, r, s);

    // If the cursor enters a different hex, flag that a drag occurred
    if (initialHexRef.current && k !== initialHexRef.current) {
      dragOccurredRef.current = true;
    }

    if (selectedCells.has(k)) {
      setActiveSelection(new Set([k]));
      return;
    }

    // Check if the hex is adjacent to any selected cell
    const neighbors = getNeighborKeys(q, r, s);
    const isNeighbor = neighbors.some((neighbor) => selectedCells.has(neighbor));

    if (isNeighbor) {
      setActiveSelection(new Set([k]));
    } else {
      setActiveSelection(new Set([]));    }
  }

  /** Handle mouse up to finalize selection and navigate */
  function onMouseUp() {
    if (!isDragging) return;
    setIsDragging(false);
    if(activeSelection.size === 0 ){
        initialHexRef.current = null;
        dragOccurredRef.current = false;
        return;
    }
    const puzzleObj = puzzles.find((p) => hexKey(p.q, p.r, p.s) === [...activeSelection][0] );

    // encode any “unsafe” characters (including “?”) into %‑escapes
    router.push(`/puzzle/${encodeURIComponent(puzzleObj.id)}`);

    // Reset the refs after click
    initialHexRef.current = null;
    // dragOccurredRef.current = false;
  }

  // Global mouse up handler
  useEffect(() => {
    if (!isDragging) return;
    const handleUp = () => onMouseUp();
    window.addEventListener("mouseup", handleUp);
    return () => window.removeEventListener("mouseup", handleUp);
  }, [isDragging, activeSelection, selectedCells]);

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
    layoutParams, outline
  );

  /** Handle mouse leaving the grid area */
  function onGridMouseLeave() {
    if (isDragging) {
      setActiveSelection(new Set([]));    }
  }

  function onHexMouseLeave(q, r, s, e) {
    if (!isDragging) return;

    if (e.relatedTarget && e.relatedTarget.getAttribute("data-active-inset") === "true") {
        return;
    }
    setActiveSelection(new Set([]))
  }
  

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center", display: "flex" }}>
    <div className = "selectWrapper">
      <HexGrid
        width={hexGridWidth}
        height={hexGridHeight}
        viewBox={viewBox}
        onMouseLeave={onGridMouseLeave}
      >
        <Layout {...layoutParams}>
          {visiblePuzzles.map((hex) => {
            const k = hexKey(hex.q, hex.r, hex.s);
            const fill = difficultyColor(hex.difficulty);
            // const stroke = hex.generationSettings ? "#0000ff" : "#fff";
            return (
              <Hexagon
                key={k}
                q={hex.q}
                r={hex.r}
                s={hex.s}
                onMouseDown={(e) => onHexMouseDown(hex.q, hex.r, hex.s, e)}
                onMouseEnter={() => onHexMouseEnter(hex.q, hex.r, hex.s)}
                onMouseLeave={(e) => onHexMouseLeave(hex.q, hex.r, hex.s, e)}
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
            data-active-inset="true"
            d={d}
            fill="none"
            stroke="#228B22" // Consistent color for active selection #006600
            strokeWidth={activeSelectionStrokeWidth}
            style={{
                pointerEvents: "auto",
            }}
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
    </div>
  );
}

export default function PuzzleSelectPage() {
  const router = useRouter();
  // const { session } = useAuth();
  const { notifyLocalDataUpdated, localDataVersion } = useAuth();


  // State to track completed puzzles and loading status
  const [completedPuzzles, setCompletedPuzzles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let didMigrate = false;
    console.log("localDataVersion changed:", localDataVersion);
  
    try {
      const storedVersion  = Number(localStorage.getItem("lastVersion") || 0);
      let   loadedPuzzles  = JSON.parse(localStorage.getItem("completedPuzzles") || "[]");
      let   completionCnts = JSON.parse(localStorage.getItem("puzzleCompletionCounts") || "{}");
  
      if (storedVersion < CURRENT_VERSION) {
        didMigrate = true;
  
        // Collect everything that changed since the user’s storedVersion
        const { removed, moved } = collectMigrationActions(storedVersion, CURRENT_VERSION);
  
        // Apply moves + removals in one place
        ({ puzzles: loadedPuzzles, counts: completionCnts } =
          applyMigrations({ puzzles: loadedPuzzles, counts: completionCnts }, removed, moved));
  
        // If this is the big v3‑upgrade that introduced the count object, seed any new puzzles
        if (storedVersion < 3) {
          loadedPuzzles.forEach(id => { if (!(id in completionCnts)) completionCnts[id] = 1; });
        }
  
        // Persist the migrated data
        localStorage.setItem("completedPuzzles",       JSON.stringify(loadedPuzzles));
        localStorage.setItem("puzzleCompletionCounts", JSON.stringify(completionCnts));
        localStorage.setItem("lastVersion",            String(CURRENT_VERSION));
      }
  
      setCompletedPuzzles(loadedPuzzles);
    } catch (err) {
      console.error("Failed to load or migrate puzzles:", err);
      setCompletedPuzzles([]);
    } finally {
      setIsLoading(false);
    }
  
    if (didMigrate) {
      console.log("Migration completed. New version:", CURRENT_VERSION);
      notifyLocalDataUpdated();
    }
  }, [localDataVersion]);
    

  // // Load completed puzzles from localStorage with migration
  // useEffect(() => {
  //   try {
  //     const migratedPuzzles = loadAndMigrateCompletedPuzzles();
  //     setCompletedPuzzles(migratedPuzzles);
  //   } catch (error) {
  //     console.error("Failed to load completed puzzles from localStorage:", error);
  //     setCompletedPuzzles([]);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, []);

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

  // If no completed puzzles, do not render HexGridSelector (redirect is in progress)
  if (completedPuzzles.length === 0) {
    return null; 
  }

  // Render the HexGridSelector only if there are completed puzzles
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100svh",
        backgroundColor: "#c6e2e9",
      }}
    >
      <div>
        <PuzzleHeader isSelectMode = "true" puzzles = {puzzles} completedPuzzles={completedPuzzles}/>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
        }}
      >
        <HexGridSelector puzzles={puzzles} completedPuzzles={completedPuzzles} />
      </div>
    </main>
  );
  
}
