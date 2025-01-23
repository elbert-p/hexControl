// makeHardPuzzle.js

import solvePuzzle from './solvePuzzle.js';

/**
 * Flips the color of a hex in the mapData.
 * @param {Array} mapData - Array of hex objects { q, r, s, color }
 * @param {string} hexKey - The key of the hex to flip (e.g., "0,0,0")
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
 * Makes the puzzle hard by ensuring it has between 1 and 5 solutions.
 * It modifies the mapData by flipping hex colors based on the current number of solutions.
 * @param {Array} mapData - Initial map data as an array of hex objects { q, r, s, color }
 * @param {number} colorToWin - The color that needs to have majority (0 or 1)
 * @param {number} regionSize - Number of hexes per region (e.g., 7)
 * @param {number} maxSolutions - Maximum number of solutions allowed (default: 5)
 * @param {number} maxAttempts - Maximum number of attempts to modify the map (default: 1000)
 * @returns {Promise<Array>} - Modified mapData with 1-5 solutions
 * @throws {Error} - If unable to create a hard puzzle within maxAttempts
 */
export default function makeHardPuzzle(
  mapData,
  colorToWin = 1,
  regionSize = 7,
  maxSolutions = 5,
  maxAttempts = 1000
) {
  const triedMaps = new Set();
  let currentMap = mapData;
  let attempts = 0;

  // Serialize and add the initial map to triedMaps
  triedMaps.add(serializeMap(currentMap));

  while (attempts < maxAttempts) {
    attempts += 1;

    // Solve the puzzle, allowing up to (maxSolutions + 1) to check if it exceeds
    const solutions = solvePuzzle(currentMap, colorToWin, regionSize, maxSolutions + 1);

    if (solutions.length >= 1 && solutions.length <= maxSolutions) {
      // Found a hard puzzle
      console.log(`Hard puzzle found after ${attempts} attempts.`);
      return currentMap;
    }

    if (solutions.length > maxSolutions) {
      // Too many solutions: flip a random hex with color == colorToWin
      const hexesToFlip = getHexesByColor(currentMap, colorToWin);

      if (hexesToFlip.length === 0) {
        throw new Error(
          `No hexes available to flip to reduce solutions. Attempts: ${attempts}`
        );
      }

      // Select a random hex to flip
      const randomHex =
        hexesToFlip[Math.floor(Math.random() * hexesToFlip.length)];

      // Flip the selected hex
      const newMap = flipHexColor(currentMap, randomHex);
      const serialized = serializeMap(newMap);

      if (!triedMaps.has(serialized)) {
        triedMaps.add(serialized);
        currentMap = newMap;
      } else {
        // If already tried, continue to next attempt
        continue;
      }
    } else if (solutions.length === 0) {
      // No solutions: flip a random hex with color != colorToWin
      const hexesToFlip = getHexesByColor(currentMap, colorToWin === 0 ? 1 : 0);

      if (hexesToFlip.length === 0) {
        throw new Error(
          `No hexes available to flip to create solutions. Attempts: ${attempts}`
        );
      }

      // Select a random hex to flip
      const randomHex =
        hexesToFlip[Math.floor(Math.random() * hexesToFlip.length)];

      // Flip the selected hex
      const newMap = flipHexColor(currentMap, randomHex);
      const serialized = serializeMap(newMap);

      if (!triedMaps.has(serialized)) {
        triedMaps.add(serialized);
        currentMap = newMap;
      } else {
        // If already tried, continue to next attempt
        continue;
      }
    } else {
      // Number of solutions is between 1 and maxSolutions; should have been caught above
      console.log(currentMap)
      return currentMap;
    }
  }

  throw new Error(
    `Unable to create a hard puzzle with 1-${maxSolutions} solutions within ${maxAttempts} attempts.`
  );
}
