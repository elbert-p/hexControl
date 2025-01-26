// /src/components/HexGridPuzzle.js
"use client";

import React, { useState, useEffect, useRef } from "react";
import { HexGrid, Layout, Hexagon } from "react-hexgrid";
import ClipperLib from "clipper-lib";
import solvePuzzle from "/src/app/solvePuzzle.js";

/** 2) Convert color (0 or 1) → hex code. */
function colorToHex(color) {
  return color === 0 ? "#ff8888" : "#88f"; //d8ee99 //ffff88 //ff8888
}

/** 3) (q,r,s) -> "q,r,s". */
function hexKey(q, r, s) {
  return `${q},${r},${s}`;
}

function blendColors(baseColor, outlineColor, alpha = 0.3) {
  // Remove "#" if present
  let b = baseColor.replace("#", "");
  let o = outlineColor.replace("#", "");

  // Expand shorthand (#abc → #aabbcc)
  if (b.length === 3) {
    b = b[0] + b[0] + b[1] + b[1] + b[2] + b[2];
  }
  if (o.length === 3) {
    o = o[0] + o[0] + o[1] + o[1] + o[2] + o[2];
  }

  // Convert to numeric RGB
  const baseR = parseInt(b.slice(0, 2), 16),
        baseG = parseInt(b.slice(2, 4), 16),
        baseB = parseInt(b.slice(4, 6), 16);
  const outR = parseInt(o.slice(0, 2), 16),
        outG = parseInt(o.slice(2, 4), 16),
        outB = parseInt(o.slice(4, 6), 16);

  // Blended RGB = (1-alpha)*base + alpha*outline
  const r = Math.round(baseR * (1 - alpha) + outR * alpha);
  const g = Math.round(baseG * (1 - alpha) + outG * alpha);
  const bVal = Math.round(baseB * (1 - alpha) + outB * alpha);

  // Convert back to hex
  return (
    "#" +
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    bVal.toString(16).padStart(2, "0")
  );
}

/** 4) Check if active selection overlaps existing selections. */
function checkOverlap(newSet, selections) {
  for (const sel of selections) {
    for (const ck of sel.cells) {
      if (newSet.has(ck)) return true;
    }
  }
  return false;
}

/** 5) Build region object with { cells, count0, count1 }. */
function buildRegionObject(cellArray, hexStates) {
  let count0 = 0;
  let count1 = 0;
  cellArray.forEach((ck) => {
    if (hexStates[ck] === 0) count0++;
    else count1++;
  });
  return { cells: cellArray, count0, count1 };
}

/** 6) Convert (q,r,s) → "q,r,s". */
function hexToPixel(q, r, layout) {
  // pointy-top coords from RedBlobGames
  const { x: sizeX, y: sizeY } = layout.size;
  const { x: originX, y: originY } = layout.origin || { x: 0, y: 0 };
  const spacing = layout.spacing ?? 1;

  const px =
    spacing * sizeX * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r) + originX;
  const py = spacing * sizeY * ((3 / 2) * r) + originY;
  return { x: px, y: py };
}

/** 7) Get the 6 corners of a pointy-top hex in final SVG coords (no inset). */
function getHexCorners(q, r, layout) {
  const center = hexToPixel(q, r, layout);
  const { x: sizeX, y: sizeY } = layout.size;
  const spacing = layout.spacing ?? 1;

  // We'll store each corner as {x, y}, in floating coords
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 30; // pointy-top
    const angleRad = (Math.PI / 180) * angleDeg;

    const cornerX = center.x + spacing * sizeX * Math.cos(angleRad);
    const cornerY = center.y + spacing * sizeY * Math.sin(angleRad);
    corners.push({ x: cornerX, y: cornerY });
  }
  return corners;
}

/** 8) Convert float coords → Clipper integer coords by scaling. 
 *    ClipperLib requires integer coords for robust operations. */
function floatToClipperPoints(corners, scale) {
  return corners.map((pt) => ({
    X: Math.round(pt.x * scale),
    Y: Math.round(pt.y * scale),
  }));
}

/** 9) Convert Clipper integer coords → an SVG path string, scaled back down by `1/scale`. */
function clipperPathsToSvg(paths, scale) {
  // Each path is an array of {X, Y}
  return paths.map((path) => {
    if (!path.length) return "";
    let d = `M ${path[0].X / scale},${path[0].Y / scale}`;
    for (let i = 1; i < path.length; i++) {
      d += ` L ${path[i].X / scale},${path[i].Y / scale}`;
    }
    return d + " Z";
  });
}

/** 10) Build the union of all selected hexes (full-size), then do an *inset* with Clipper. 
 *      Returns array of path strings for the final outlines. */
function computeInsetOutline(cellKeys, layout, offsetDelta = -600) { // Default updated below
  if (!cellKeys || cellKeys.length === 0) return [];

  const SCALE = 1000; // scale factor to reduce floating errors
  // 1) Convert each selected hex to a polygon of Clipper points
  const polygons = [];

  cellKeys.forEach((ck) => {
    const [q, r, s] = ck.split(",").map(Number);
    // get normal corners (float)
    const floatCorners = getHexCorners(q, r, layout);
    // convert to Clipper integer coords
    const poly = floatToClipperPoints(floatCorners, SCALE);
    polygons.push(poly);
  });

  // 2) Union all those polygons into a single solution (or multi-polygon).
  const cpr = new ClipperLib.Clipper();
  cpr.AddPaths(polygons, ClipperLib.PolyType.ptSubject, true);
  const unionSolution = new ClipperLib.Paths();
  cpr.Execute(
    ClipperLib.ClipType.ctUnion,
    unionSolution,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero
  );

  if (!unionSolution.length) return [];

  // 3) Use ClipperOffset to inset (negative offset).
  const co = new ClipperLib.ClipperOffset();
  co.AddPaths(
    unionSolution,
    ClipperLib.JoinType.jtRound,
    ClipperLib.EndType.etClosedPolygon
  );
  const offsetSolution = new ClipperLib.Paths();
  co.Execute(offsetSolution, offsetDelta);

  // 4) Convert offset polygons => SVG path strings
  return clipperPathsToSvg(offsetSolution, SCALE);
}

/** Helper function to calculate the bounding box of the cluster */
function calculateBounds(mapData) {
  const qs = mapData.map((h) => h.q);
  const rs = mapData.map((h) => h.r);
  const minQ = Math.min(...qs);
  const maxQ = Math.max(...qs);
  const minR = Math.min(...rs);
  const maxR = Math.max(...rs);
  return { minQ, maxQ, minR, maxR };
}

/** 
 * Helper function to calculate the center of the cluster in pixel coordinates 
 * Updated to compute the centroid instead of the midpoint of bounds
 */
function calculateCenter(mapData, layout) {
  const total = mapData.length;
  const sumQ = mapData.reduce((acc, h) => acc + h.q, 0);
  const sumR = mapData.reduce((acc, h) => acc + h.r, 0);
  const centerQ = sumQ / total;
  const centerR = sumR / total;
  return hexToPixel(centerQ, centerR, layout);
}

/** Helper function to find the region containing a specific hex */
function findRegionContaining(hexKey, selections) {
  for (let i = 0; i < selections.length; i++) {
    if (selections[i].cells.includes(hexKey)) {
      return i;
    }
  }
  return -1;
}

/** Helper function to check adjacency */
function areAdjacent(hex1, hex2) {
  const [q1, r1, s1] = hex1.split(",").map(Number);
  const [q2, r2, s2] = hex2.split(",").map(Number);
  const directions = [
    [1, -1, 0],
    [1, 0, -1],
    [0, 1, -1],
    [-1, 1, 0],
    [-1, 0, 1],
    [0, -1, 1],
  ];
  for (let dir of directions) {
    const neighbor = `${q1 + dir[0]},${r1 + dir[1]},${s1 + dir[2]}`;
    if (neighbor === hex2) return true;
  }
  return false;
}

/** Helper function to check if a hex is adjacent to any hex in a set */
function isAdjacentToSelection(hexKey, selection) {
  for (let selHex of selection) {
    if (areAdjacent(hexKey, selHex)) return true;
  }
  return false;
}

/** 
 * Helper function to compute pixel bounds for dynamic sizing.
 */
function computePixelBounds(mapData, layoutParamsBase) {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  mapData.forEach((hex) => {
    const corners = getHexCorners(hex.q, hex.r, layoutParamsBase);
    corners.forEach((corner) => {
      if (corner.x < minX) minX = corner.x;
      if (corner.x > maxX) maxX = corner.x;
      if (corner.y < minY) minY = corner.y;
      if (corner.y > maxY) maxY = corner.y;
    });
  });

  return { minX, maxX, minY, maxY };
}

/**
 * Helper function to find connected components within a set of cell keys.
 * @param {Array<string>} cellKeys - Array of cell keys (e.g., ["0,0,0", "1,-1,0", ...])
 * @returns {Array<Array<string>>} - Array of connected components, each being an array of cell keys.
 */
function getConnectedComponents(cellKeys) {
  const remaining = new Set(cellKeys);
  const components = [];

  while (remaining.size > 0) {
    const start = remaining.values().next().value;
    const queue = [start];
    const component = new Set();
    component.add(start);
    remaining.delete(start);

    while (queue.length > 0) {
      const current = queue.shift();
      const [q, r, s] = current.split(",").map(Number);
      const directions = [
        [1, -1, 0],
        [1, 0, -1],
        [0, 1, -1],
        [-1, 1, 0],
        [-1, 0, 1],
        [0, -1, 1],
      ];

      directions.forEach((dir) => {
        const neighbor = `${q + dir[0]},${r + dir[1]},${s + dir[2]}`;
        if (remaining.has(neighbor)) {
          queue.push(neighbor);
          component.add(neighbor);
          remaining.delete(neighbor);
        }
      });
    }

    components.push(Array.from(component));
  }

  return components;
}
function shallowEqualSelections(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    // Quick approach: compare JSON. For larger apps, you'd do a more efficient compare.
    if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Helper function to remove a hex from a region and split if necessary.
 * @param {Array<Object>} selections - Current selections array.
 * @param {number} regionIndex - Index of the region in selections.
 * @param {string} hexKey - Key of the hex to remove.
 * @param {Object} hexStates - Current hex states.
 * @returns {Array<Object>} - Updated selections array.
 */
function removeHexAndSplit(selections, regionIndex, hexKey, hexStates) {
  const region = selections[regionIndex];
  const newCells = region.cells.filter((ck) => ck !== hexKey);

  if (newCells.length === 0) {
    // Remove the entire region
    return selections
      .slice(0, regionIndex)
      .concat(selections.slice(regionIndex + 1));
  } else {
    // Find connected components
    const connectedComponents = getConnectedComponents(newCells);

    if (connectedComponents.length === 1) {
      // Still connected, update the region
      const updatedRegion = buildRegionObject(newCells, hexStates);
      const newSelections = [...selections];
      newSelections[regionIndex] = updatedRegion;
      return newSelections;
    } else {
      // Split into multiple regions
      const updatedRegions = selections.slice(0, regionIndex).concat(selections.slice(regionIndex + 1));
      connectedComponents.forEach((component) => {
        const newRegion = buildRegionObject(component, hexStates);
        updatedRegions.push(newRegion);
      });
      return updatedRegions;
    }
  }
}

/* ADDED: Helper function to determine outline color based on region's validity and majority color */
function getSelectionOutlineColor(selection, groupSize, wantedColor) {
  const cellCount = selection.cells.length;
  if (cellCount !== groupSize) {
    return "#FF1493"; // Pink for invalid group size
  }

  const wantedCount = selection[`count${wantedColor}`];
  const otherColor = wantedColor === 0 ? 1 : 0;
  const otherCount = selection[`count${otherColor}`];

  if (wantedCount > otherCount) {
    // Majority for wantedColor
    return wantedColor === 1 ? "#00008B" : "#700000"; // Blue or Dark Red
  } else {
    // Majority for other color
    return wantedColor === 1 ? "#700000" : "#00008B"; // Dark Red or Blue
  }
}

/* CHANGED: Modified component to include undo functionality and dynamic outline coloring */
export default function HexGridPuzzle({
  mapData: mapData = [{ q: 0, r: 0, s: 0, color: 0 }],
  colorToWin = 1,
  regionSize = 3,
  sizeMultiplier = 1.5,
  onPuzzleStateChange,
}) {
  const [hexStates, setHexStates] = useState(() => {
    const st = {};
    mapData.forEach((hx) => {
      st[hexKey(hx.q, hx.r, hx.s)] = hx.color;
    });
    return st;
  });

  // Final selections: each is { cells, count0, count1 }
  const [selections, setSelections] = useState([]);
  // Active selection (Set of cell keys)
  const [activeSelection, setActiveSelection] = useState(new Set());

  const [pickedRegion, setPickedRegion] = useState(null);  // <-- ADDED
  // Are we dragging?
  const [isDragging, setIsDragging] = useState(false);

  /* ADDED: History state to keep track of all previous selections for undo */
  const [history, setHistory] = useState([]);

  // const sizeMultiplier = 1.5;
  // Base layout parameters
  const layoutParamsBase = {
    size: { x: 24 * sizeMultiplier, y: 24 * sizeMultiplier },
    flat: false,
    spacing: 1,
    origin: { x: 0, y: 0 }, // Fixed origin
  };

  // 1) Immediately compute the initial bounds from mapData
  const initialBounds = computePixelBounds(mapData, layoutParamsBase);

  // 2) Store them in state
  const [bounds, setBounds] = useState(initialBounds);

  // 3) If mapData might change, keep the useEffect to recalc bounds
  useEffect(() => {
    const computedBounds = computePixelBounds(mapData, layoutParamsBase);
    setBounds(computedBounds);
  }, [mapData]);

  // Calculate the center of the cluster (not used to shift origin, but you could if desired)
  const clusterCenter = calculateCenter(mapData, layoutParamsBase);

  // Final layout parameters with fixed origin
  const layoutParams = {
    ...layoutParamsBase,
    // origin is fixed at { x: 0, y: 0 }
  };

  /** Prevent infinite loop by tracking previous state */
  const prevPuzzleRef = useRef({ virtualSelections: [], hexStates: {} });

  // After any change to selections or hexStates, notify parent if onPuzzleStateChange is provided
  useEffect(() => {
    if (!onPuzzleStateChange) return;

    // Combine pickedRegion with selections so it “acts” as if it’s still in selections
    const virtualSelections = pickedRegion
      ? [...selections, pickedRegion]
      : selections;
    const prevVirtual = prevPuzzleRef.current.virtualSelections;
    const prevHexStates = prevPuzzleRef.current.hexStates;

    // Compare new vs old
    const selectionsChanged = !shallowEqualSelections(virtualSelections, prevVirtual);
    const hexStatesChanged = prevHexStates !== hexStates;

    // Only call onPuzzleStateChange if there's a real change
    if (selectionsChanged || hexStatesChanged) {
      onPuzzleStateChange({
        selections: virtualSelections,
        hexStates,
      });
      // Update the ref
      prevPuzzleRef.current = {
        virtualSelections,
        hexStates
      };
    }
  }, [selections, pickedRegion, hexStates, onPuzzleStateChange]);

  useEffect(() => {
    if (hasSolvedRef.current || !mapData || mapData.length === 0) return;
    hasSolvedRef.current = true;
    // Define a function to solve the puzzle
    const solve = () => {
      console.log("🧩 Solving the puzzle...");
      const solutions = solvePuzzle(mapData, colorToWin, regionSize, 6);
      console.log(`💡 Number of solutions found: ${solutions.length}`);
      if (solutions.length > 0) {
        console.log("✅ Applying the first solution:", solutions[0]);
        const firstSolution = solutions[0];
        const regionObjects = firstSolution.map(region => buildRegionObject(region, hexStates));
        setSelections(regionObjects);
      } else {
        console.log("⚠️ No valid solutions found.");
      }
    };
    // solve();// Comment this line to disable auto-solving
  }, [mapData]);

  /** Helper function to compare two sets for equality */
  const areSetsEqual = (setA, setB) => {
    if (setA.size !== setB.size) return false;
    for (let item of setA) {
      if (!setB.has(item)) return false;
    }
    return true;
  };

  /** ADDED: Refs to track initial hex and drag occurrence */
  const initialHexRef = useRef(null);
  const dragOccurredRef = useRef(false);
  const hasSolvedRef = useRef(false);

  /** Updated onHexMouseDown to handle starting selection from existing region */
  function onHexMouseDown(q, r, s, e) {
    e.stopPropagation();
    const k = hexKey(q, r, s);
    initialHexRef.current = k;
    dragOccurredRef.current = false;
  
    // **Save the current state to history at the start of the action**
    setHistory((prevHistory) => [...prevHistory, selections]);
  
    const regionIndex = findRegionContaining(k, selections);
  
    if (regionIndex !== -1) {
      // Record the region being picked up
      const oldRegion = selections[regionIndex];
      setPickedRegion(oldRegion);
  
      // Remove the picked region from selections
      setSelections((prev) => [
        ...prev.slice(0, regionIndex),
        ...prev.slice(regionIndex + 1),
      ]);
  
      // Initialize active selection with the picked region's cells
      setActiveSelection(new Set(oldRegion.cells));
    } else {
      // No existing region => start a fresh 1‑hex selection
      setPickedRegion(null);
      setActiveSelection(new Set([k]));
    }
  
    // Begin dragging
    setIsDragging(true);
  }  

  /** Updated onHexEnter to add hexes based on adjacency and region constraints */
  function onHexEnter(q, r, s) {
    if (!isDragging) return;
    const k = hexKey(q, r, s);
  
    // If the cursor enters a different hex than the initial one, it's a real drag
    if (initialHexRef.current && k !== initialHexRef.current) {
      dragOccurredRef.current = true;
    }
  
    // If we already have it, do nothing
    if (activeSelection.has(k)) return;
  
    // **Enforce adjacency so the region stays contiguous:**
    if (!isAdjacentToSelection(k, activeSelection)) return;
  
    // **Remove this hex from whatever other region it might have been in:**
    const oldRegionIndex = findRegionContaining(k, selections);
    if (oldRegionIndex !== -1) {
      setSelections((prev) =>
        removeHexAndSplit(prev, oldRegionIndex, k, hexStates)
      );
    }
  
    // **Also remove it from pickedRegion itself, if that's where it was:**
    if (pickedRegion && pickedRegion.cells.includes(k)) {
      const newCells = pickedRegion.cells.filter((cellKey) => cellKey !== k);
      if (newCells.length > 0) {
        setPickedRegion(buildRegionObject(newCells, hexStates));
      } else {
        // If we removed its last hex, that region disappears
        setPickedRegion(null);
      }
    }
  
    // Finally, add the new hex to the active selection
    setActiveSelection((prev) => {
      const next = new Set(prev);
      next.add(k);
      return next;
    });
  }  

  /** Updated onMouseUp to finalize the selection */
  function onMouseUp() {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (!dragOccurredRef.current) {
      // ============= Single Click =============
      const clickedKey = initialHexRef.current;
      
      if (pickedRegion) {
        // Single-click on a hex that was inside the region we "picked up"
        // => remove that 1 hex from the old region, then put the remainder back
        const leftoverCells = pickedRegion.cells.filter((ck) => ck !== clickedKey);
        
        if (leftoverCells.length > 0) {
          // Could be 1 or multiple connected components:
          const comps = getConnectedComponents(leftoverCells);
          setSelections((prev) => [
            ...prev,
            ...comps.map((c) => buildRegionObject(c, hexStates)),
          ]);
        }
        // If leftoverCells.length === 0, the region is entirely removed; no action needed
      } else {
        // Single-click on a hex with no picked region
        const regionIndex = findRegionContaining(clickedKey, selections);
        if (regionIndex !== -1) {
          // Single-click on a hex in some existing region
          setSelections((prev) =>
            removeHexAndSplit(prev, regionIndex, clickedKey, hexStates)
          );
        } else {
          // Single-click on a hex with no region => create new 1‑hex region
          setSelections((prev) => [
            ...prev,
            buildRegionObject([clickedKey], hexStates),
          ]);
        }
      }
    } else {
      // ============= Actual Drag =============
  
      // **No history saving here since it's already handled in onHexMouseDown**
  
      // Everything we dragged is now in activeSelection
      const finalCells = Array.from(activeSelection);
      if (finalCells.length > 0) {
        // Create a new or updated region from that set
        const newRegion = buildRegionObject(finalCells, hexStates);
        setSelections((prev) => [...prev, newRegion]);
      }
  
      // Handle leftover cells from the originally picked region, if any
      if (pickedRegion) {
        // leftover = pickedRegion.cells - finalCells
        const leftoverCells = pickedRegion.cells.filter(
          (ck) => !activeSelection.has(ck)
        );
        
        if (leftoverCells.length) {
          // Possibly it splits, so run getConnectedComponents:
          const comps = getConnectedComponents(leftoverCells);
          setSelections((prev) => [
            ...prev,
            ...comps.map((c) => buildRegionObject(c, hexStates)),
          ]);
        }
      }
    }
  
    // Reset everything
    setPickedRegion(null);
    setActiveSelection(new Set());
    initialHexRef.current = null;
    dragOccurredRef.current = false;
  }  

  // Define stroke widths
  const hexStrokeWidth = 2.4 * sizeMultiplier;
  const selectionStrokeWidth = 3.6 * sizeMultiplier;
  const activeSelectionStrokeWidth = 4.2 * sizeMultiplier;

  // Define the scaling factor
  const SCALE = 1000;

  // Calculate dynamic inset based on stroke widths
  const activeInset = -((hexStrokeWidth + activeSelectionStrokeWidth) / 2) * SCALE; // e.g., -1.2 * 1000 = -1200
  const selectionInset = -((hexStrokeWidth + selectionStrokeWidth) / 2) * SCALE; // e.g., -1.8 * 1000 = -1800

  /* ADDED: Compute active selection paths */
  const activePaths = computeInsetOutline(
    Array.from(activeSelection),
    layoutParamsBase,
    activeInset
  );

  const activeRegionObj = buildRegionObject(Array.from(activeSelection), hexStates);
  const activeOutlineColor = getSelectionOutlineColor(
    activeRegionObj,
    regionSize,
    colorToWin
  );

  /* Compute selection data with paths and their respective outline colors */
  const selectionData = selections.map((sel) => {
    const paths = computeInsetOutline(sel.cells, layoutParamsBase, selectionInset);
    const color = getSelectionOutlineColor(sel, regionSize, colorToWin);
    return { paths, color };
  });
  const hexToFinalColor = {};
  // selections.forEach((sel) => {
  //   // Build the region object so we get the correct outline color
  //   const regionObj = buildRegionObject(sel.cells, hexStates);
  //   const outlineColor = getSelectionOutlineColor(
  //     regionObj,
  //     regionSize,
  //     colorToWin
  //   );

  //   // For each hex in this region, blend the base color with the outline color
  //   if(outlineColor != "#FF1493"){
  //     sel.cells.forEach((cellKey) => {
  //       const baseColor = colorToHex(hexStates[cellKey]);
  //       const blendedColor = blendColors(baseColor, outlineColor, 0.1);
  //       hexToFinalColor[cellKey] = blendedColor;
  //     });
  //   }
  // });
  
  const clusterOutlinePaths = computeInsetOutline(
    mapData.map(hex => hexKey(hex.q, hex.r, hex.s)),
    layoutParamsBase, -selectionInset
  );

  // Handler for keydown events
  useEffect(() => {
    function handleKeyDown(event) {
      // Check if the focus is on an input element to prevent interfering with typing
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.isContentEditable);

      if (isInputFocused) return;

      if (event.key === "z" || event.key === "Z") {
        event.preventDefault();
        setHistory((prevHistory) => {
          if (prevHistory.length === 0) return prevHistory;
          const lastState = prevHistory[prevHistory.length - 1];
          setSelections(lastState);
          return prevHistory.slice(0, -1);
        });
      } else if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        // Push current selections to history before resetting
        setHistory((prevHistory) => [...prevHistory, selections]);
        setSelections([]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selections]);

  // Calculate dynamic width and height based on bounds
  const { minX, maxX, minY, maxY } = bounds;
  const margin = 20; // Extra margin around the puzzle
  const widthPx = maxX - minX + margin * 2;
  const heightPx = maxY - minY + margin * 2;
  const viewBox = `${minX - margin} ${minY - margin} ${widthPx} ${heightPx}`;

  // Effect to handle global mouseup events to fix dragging state
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseUp = () => {
      onMouseUp();
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);

    // Cleanup the event listener when dragging ends
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging, activeSelection, selections, hexStates, pickedRegion]);

  return (
    <div style={{ display: "inline-block" }}>
      <HexGrid width={widthPx} height={heightPx} viewBox={viewBox}>
        <Layout {...layoutParams}>
          {mapData.map((hex) => {
            const k = hexKey(hex.q, hex.r, hex.s);
            const baseColor = colorToHex(hexStates[k]);
            const fillColor = hexToFinalColor[k] || baseColor
            return (
              <Hexagon
                key={k}
                q={hex.q}
                r={hex.r}
                s={hex.s}
                onMouseDown={(e) => onHexMouseDown(hex.q, hex.r, hex.s, e)}
                onMouseEnter={() => onHexEnter(hex.q, hex.r, hex.s)}
                style={{
                  fill: fillColor,
                  stroke: "#fff",
                  strokeWidth: hexStrokeWidth,
                  cursor: "pointer",
                }} >
                {/* <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="15"
                  fontFamily="'Press Start 2P', sans-serif" // Blocky font
                  stroke="none"
                  fill="#fff"
                  fontWeight="900"
                  style={{
                    pointerEvents: "none",
                    userSelect: "none",
                  }} >
                  {hex.q + ',' + hex.r + ',' + hex.s}
                </text> */}
              </Hexagon>
            );
          })}
        </Layout>
        

        {/* In-progress (active) selection outline */}
        {activePaths.map((d, idx) => (
          <path
            key={`active-${idx}`}
            d={d}
            fill="none"
            stroke={activeOutlineColor}  // ← Use the computed color
            strokeWidth={activeSelectionStrokeWidth}
          />
        ))}

        {/* Final selection outlines */}
        {selectionData.map((selData, selIdx) =>
          selData.paths.map((d, i) => (
            <path
              key={`sel-${selIdx}-${i}`}
              d={d}
              fill="none"                // ← Remove the fill here
              stroke={selData.color}
              strokeWidth={selectionStrokeWidth}
            />
          ))
        )}

        {/* Cluster outline around all hexes */}
        {clusterOutlinePaths.map((d, idx) => (
          <path
            key={`cluster-outline-${idx}`}
            d={d}
            fill="none"
            stroke="#ffdf88"
            strokeWidth={selectionStrokeWidth}
          />
        ))}
      </HexGrid>
    </div>
  );
}
