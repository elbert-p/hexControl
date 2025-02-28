// makeHardPuzzle.js

import solvePuzzle from './solvePuzzle.js';

/**
 * Flips the color of a hex in the mapData.
 * @param {Array} mapData - Array of hex objects { q, r, s, color }
 * @param {string} hexKey - The key of the hex to flip (e.g. "0,0,0")
 * @returns {Array} - New mapData with the specified hex color flipped
 */
function flipHexColor(mapData, hexKey) {
  return mapData.map((hex) => {
    const key = `${hex.q},${hex.r},${hex.s}`;
    if (key === hexKey) {
      return { ...hex, color: hex.color === 0 ? 1 : 0 };
    }
    return hex;
  });
}

/**
 * Serializes the mapData into a canonical string for tracking.
 * @param {Array} mapData - Array of hex objects { q, r, s, color }
 * @returns {string} - Serialized string representation of mapData
 */
function serializeMap(mapData) {
  // Sort the mapData to ensure consistent serialization
  const sortedMap = [...mapData].sort((a, b) => {
    if (a.q !== b.q) return a.q - b.q;
    if (a.r !== b.r) return a.r - b.r;
    return a.s - b.s;
  });
  return JSON.stringify(sortedMap);
}

/**
 * Retrieves all hex keys that match a specific color.
 * @param {Array} mapData - Array of hex objects { q, r, s, color }
 * @param {number} color - The color to filter by (0 or 1)
 * @returns {Array} - Array of hex keys as strings "q,r,s"
 */
function getHexesByColor(mapData, color) {
  return mapData
    .filter((hex) => hex.color === color)
    .map((hex) => `${hex.q},${hex.r},${hex.s}`);
}

/**
 * -------------------------------------------------------------
 * REGION-PERIMETER LOGIC (OUTSIDE EDGES)
 * -------------------------------------------------------------
 * For each region in a solution, the 'outside edges' = 
 *    6 * (#hexes_in_region) - 2 * (#internal_adjacencies_in_region).
 * Summing this across all regions => total perimeter for that solution.
 * The puzzle's "edges per hex" = (total perimeter) / (total hexes).
 */

/** 
 * Build adjacency map: hexKey -> array of neighbor hexKeys
 */
function buildAdjacency(mapData) {
  const neighborDirs = [
    [1, -1, 0],
    [1, 0, -1],
    [0, 1, -1],
    [-1, 1, 0],
    [-1, 0, 1],
    [0, -1, 1],
  ];
  const hash = {};
  for (const h of mapData) {
    hash[`${h.q},${h.r},${h.s}`] = h.color; // color not strictly needed here
  }

  const adjacency = {};
  const allKeys = Object.keys(hash);
  for (const key of allKeys) {
    const [q, r, s] = key.split(',').map(Number);
    const nbrs = [];
    for (const [dq, dr, ds] of neighborDirs) {
      const nq = q + dq;
      const nr = r + dr;
      const ns = s + ds;
      const nbrKey = `${nq},${nr},${ns}`;
      if (hash.hasOwnProperty(nbrKey)) {
        nbrs.push(nbrKey);
      }
    }
    adjacency[key] = nbrs;
  }
  return adjacency;
}

/**
 * Computes outside perimeter of a region: 
 *    perimeter = 6 * regionSize - 2 * internalBoundaryCount
 */
function computeRegionPerimeter(regionKeys, adjacency) {
  const regionSet = new Set(regionKeys);
  let perimeter = regionKeys.length * 6;
  let internalBoundaries = 0;

  for (const key of regionKeys) {
    const nbrs = adjacency[key] || [];
    for (const n of nbrs) {
      if (regionSet.has(n)) {
        // Only count once per pair
        if (key < n) {
          internalBoundaries++;
        }
      }
    }
  }

  // each shared boundary subtracts 2 from the perimeter
  perimeter -= 2 * internalBoundaries;
  return perimeter;
}

/**
 * For a single solution (array of regions, each region= array of hexKeys),
 * sum region perimeters, then divide by totalHexes => edgesPerHex
 */
function computeEdgesPerHexForOneSolution(mapData, solution, adjacency) {
  const totalHexes = mapData.length;
  let totalPerimeter = 0;

  for (const region of solution) {
    totalPerimeter += computeRegionPerimeter(region, adjacency);
  }

  return totalPerimeter / totalHexes;
}

/**
 * Among all solutions, find the LOWEST edgesPerHex
 * If no solutions, return 0.
 */
function computeLowestEdgesPerHex(mapData, solutions) {
  if (!solutions || solutions.length === 0) {
    return 0;
  }
  const adjacency = buildAdjacency(mapData);
  let minVal = Infinity;
  for (const sol of solutions) {
    const val = computeEdgesPerHexForOneSolution(mapData, sol, adjacency);
    if (val < minVal) {
      minVal = val;
    }
  }
  return minVal;
}

/**
 * ---------------------------------------------------------------------------------
 * MAIN: makeHardPuzzle
 * Adds a `difficultyThreshold` parameter.
 * The puzzle is "hard" if:
 *   1) #solutions is between 1 and maxSolutions
 *   2) The puzzle's LOWEST edges-per-hex (across all solutions) is >= difficultyThreshold.
 * If not, it keeps flipping hexes. 
 * ---------------------------------------------------------------------------------
 *
 * @param {Array} mapData        - initial map data
 * @param {number} colorToWin    - color that needs majority
 * @param {number} regionSize    - number of hexes per region
 * @param {number} maxSolutions  - puzzle must have <= this many solutions
 * @param {number} maxAttempts   - iteration limit
 * @param {number} difficultyThreshold - required minimum edges/hex across solutions
 * @returns {Array} - final mapData that meets criteria
 * @throws {Error} if we cannot achieve it within maxAttempts
 */
export default function makeHardPuzzle(
  mapData,
  colorToWin = 1,
  regionSize = 5,
  maxSolutions = 5,
  maxAttempts = 1000,
  difficultyThreshold = 4
) {
  const triedMaps = new Set();
  let currentMap = mapData;
  let attempts = 0;

  // Keep a copy to the best we've found, if we find "some" solutions
  // in case you want to do a fallback approach, but here we'll just keep flipping
  triedMaps.add(serializeMap(currentMap));

  // Pre-check: Ensure enough winning-color hexes exist.
  const totalCells = currentMap.length;
  const totalRegions = Math.floor(totalCells / regionSize);
  const regionsNeeded = Math.floor(totalRegions / 2) + 1; // winning regions needed for majority
  const neededPerRegion = Math.floor(regionSize / 2) + 1;
  const requiredColorCells = regionsNeeded * neededPerRegion;

  while (attempts < maxAttempts) {
    const currentColorCount = getHexesByColor(currentMap, colorToWin).length;
    if (currentColorCount < requiredColorCells) {
      // Not enough winning color cells to ever win a majority in every region.
      // Flip a random hex (from the opposite color) back to the winning color.
      const hexesToFlip = getHexesByColor(currentMap, colorToWin === 0 ? 1 : 0);
      if (hexesToFlip.length === 0) {
        throw new Error(
          `No hexes available to flip to winning color. Attempts: ${attempts}`
        );
      }
      const randomHex =
        hexesToFlip[Math.floor(Math.random() * hexesToFlip.length)];
      const newMap = flipHexColor(currentMap, randomHex);
      const serialized = serializeMap(newMap);
      if (!triedMaps.has(serialized)) {
        triedMaps.add(serialized);
        currentMap = newMap;
      }
      // Continue to next iteration before running solver.
      continue;
    }

    attempts += 1;

    // 1) Solve puzzle (with bounding = maxSolutions+1 to detect "exceed" scenario)
    const solutions = solvePuzzle(currentMap, colorToWin, regionSize, maxSolutions + 1);

    // 2) Evaluate solutions count
    if (solutions.length >= 1 && solutions.length <= maxSolutions) {
      // => correct # of solutions, now check edges-per-hex
      const minEdgesVal = computeLowestEdgesPerHex(currentMap, solutions);

      if (minEdgesVal >= difficultyThreshold) {
        // We found a puzzle with the required difficulty
        console.log(`Hard puzzle found after ${attempts} attempts: ${solutions.length} solutions, Avg edges=${minEdgesVal}`);
        return currentMap;
      } else {
        // The puzzle has the correct # solutions, but perimeter is too low => "too easy"
        // We'll treat it similarly to "too many solutions", flipping a random colorToWin cell
        const hexesToFlip = getHexesByColor(currentMap, colorToWin);
        if (hexesToFlip.length === 0) {
          throw new Error(`No hexes left to flip to increase difficulty. Attempts: ${attempts}`);
        }
        const randomHex = hexesToFlip[Math.floor(Math.random() * hexesToFlip.length)];
        const newMap = flipHexColor(currentMap, randomHex);
        const serialized = serializeMap(newMap);

        if (!triedMaps.has(serialized)) {
          triedMaps.add(serialized);
          currentMap = newMap;
        }
        // else continue to next attempt
      }

    } else if (solutions.length > maxSolutions) {
      // Too many solutions => flip colorToWin
      const hexesToFlip = getHexesByColor(currentMap, colorToWin);

      if (hexesToFlip.length === 0) {
        throw new Error(
          `No hexes available to flip to reduce solutions. Attempts: ${attempts}`
        );
      }

      // Flip a random one
      const randomHex =
        hexesToFlip[Math.floor(Math.random() * hexesToFlip.length)];
      const newMap = flipHexColor(currentMap, randomHex);
      const serialized = serializeMap(newMap);

      if (!triedMaps.has(serialized)) {
        triedMaps.add(serialized);
        currentMap = newMap;
      }
      // else just continue

    } else if (solutions.length === 0) {
      // No solutions => flip color != colorToWin
      const hexesToFlip = getHexesByColor(currentMap, colorToWin === 0 ? 1 : 0);

      if (hexesToFlip.length === 0) {
        throw new Error(
          `No hexes available to flip to create solutions. Attempts: ${attempts}`
        );
      }

      const randomHex =
        hexesToFlip[Math.floor(Math.random() * hexesToFlip.length)];

      const newMap = flipHexColor(currentMap, randomHex);
      const serialized = serializeMap(newMap);

      if (!triedMaps.has(serialized)) {
        triedMaps.add(serialized);
        currentMap = newMap;
      }
      // else continue

    } else {
      // Shouldn't logically happen, because we've covered 0, 1..max, >max
      // but just in case:
      return currentMap;
    }
  }

  throw new Error(
    `Unable to create a hard puzzle (1..${maxSolutions} solutions, edges/hex >= ${difficultyThreshold}) within ${maxAttempts} attempts.`
  );
}
