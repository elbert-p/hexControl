// solvePuzzle.js
/**
 * Gerrymandering Puzzle Solver in JavaScript.
 * 
 * @param {Array} mapData - array of { q, r, s, color }
 * @param {number} regionSize - number of hexes per region (e.g., 7)
 * @param {number} colorToWin - the color to have majority in groups (0 or 1)
 * @param {number} max_solutions - number of solutions before returning
 * @returns {Array<Array<Array<string>>>} Array of solutions;
 *    each solution is an array of regions, and each region is an array of hexKeys (e.g. "q,r,s").
 * 
 * Example return structure:
 * [
 *   [
 *     ["0,0,0", "1,0,-1", "0,1,-1"],  // Region #1
 *     ["-1,0,1", "0,-1,1", "1,-1,0"], // Region #2
 *     ...
 *   ],
 *   [
 *     ...
 *   ],
 *   ...
 * ]
 */
export default function solvePuzzle(mapData, colorToWin = 1, regionSize = 7, max_solutions = 5) {
  // Build a dict of hexKey -> color
  // hexKey is a string "q,r,s"
  // console.log(mapData, colorToWin, regionSize, max_solutions)
  const hexes = {};
  for (const cell of mapData) {
    const { q, r, s, color } = cell;
    const key = `${q},${r},${s}`;
    hexes[key] = color;
  }

  // The six neighbors in cubic coords around (q, r, s)
  const neighborDirs = [
    [1, -1, 0],
    [1, 0, -1],
    [0, 1, -1],
    [-1, 1, 0],
    [-1, 0, 1],
    [0, -1, 1],
  ];

  // Precompute adjacency
  const adjacency = {};
  const allKeys = Object.keys(hexes);

  function getNeighbors(key) {
    const [q, r, s] = key.split(',').map(Number);
    const results = [];
    for (const [dq, dr, ds] of neighborDirs) {
      const nq = q + dq;
      const nr = r + dr;
      const ns = s + ds;
      const neighborKey = `${nq},${nr},${ns}`;
      if (hexes.hasOwnProperty(neighborKey)) {
        results.push(neighborKey);
      }
    }
    return results;
  }

  for (const k of allKeys) {
    adjacency[k] = getNeighbors(k);
  }

  // Basic puzzle parameters
  const totalHexCount = allKeys.length;
  const totalRegions = Math.floor(totalHexCount / regionSize); // should be an integer if puzzle is valid
  const neededToWinMajority = Math.floor(totalRegions / 2) + 1; // #winning regions needed for majority

  // Keep track of solutions found
  // We'll store each solution in a canonical form (string) in solutionsSet for uniqueness
  const solutionsFound = [];
  const solutionsSet = new Set(); 

  // Keep track of tested region combos to prune duplicates
  const testedRegionCombos = new Set();

  // -----------
  // HELPER FUNCS
  // -----------

  // Returns true if regionSet is contiguous (connected)
  // (In this puzzle code, we typically rely on contiguous sets,
  //  but we also do direct BFS expansions, so an explicit check
  //  is sometimes omitted. Provided here for reference.)
  function checkContiguousRegion(regionSet) {
    if (!regionSet.size) return false;

    const regionArr = [...regionSet];
    const start = regionArr[0];
    const visited = new Set([start]);
    const queue = [start];

    while (queue.length > 0) {
      const curr = queue.shift();
      for (const nbr of adjacency[curr]) {
        if (regionSet.has(nbr) && !visited.has(nbr)) {
          visited.add(nbr);
          queue.push(nbr);
        }
      }
    }

    return visited.size === regionSet.size;
  }

  // Returns true if 'colorVal' has a strict majority in regionSet
  function majorityCountInRegion(regionSet, colorVal) {
    let colorCount = 0;
    for (const h of regionSet) {
      if (hexes[h] === colorVal) {
        colorCount += 1;
      }
    }
    return colorCount > (regionSet.size - colorCount);
  }

  // Check if remainingHexes can be partitioned into connected blocks each of size `regionSize`.
  // This is a quick BFS check for each connected component: its size must be a multiple of regionSize.
  function canSplitIntoRegionsOfSize(remainingHexes, size) {
    const visited = new Set();
    for (const cell of remainingHexes) {
      if (!visited.has(cell)) {
        // BFS to get the connected component
        const queue = [cell];
        const comp = new Set([cell]);
        visited.add(cell);

        while (queue.length > 0) {
          const cur = queue.shift();
          for (const nbr of adjacency[cur]) {
            if (remainingHexes.has(nbr) && !visited.has(nbr)) {
              visited.add(nbr);
              comp.add(nbr);
              queue.push(nbr);
            }
          }
        }

        if (comp.size % size !== 0) {
          return false;
        }
      }
    }
    return true;
  }

  // How many more winning regions do we need?
  function neededWinsSoFar(regionsWon, totalNeeded) {
    return totalNeeded - regionsWon;
  }

  // The maximum number of winning regions colorVal can still form,
  // based on how many colorVal cells remain.
  function maxPossibleWins(remainingHexes, colorVal, size) {
    let colorCountLeft = 0;
    for (const h of remainingHexes) {
      if (hexes[h] === colorVal) {
        colorCountLeft += 1;
      }
    }
    // For region_size N, we need more than N/2 of colorVal => at least floor(N/2) + 1
    const neededPerRegion = Math.floor(size / 2) + 1;
    return Math.floor(colorCountLeft / neededPerRegion);
  }

  // Create a stable "canonical" representation of a list of region sets
  // so we can store it in a Set for uniqueness.
  function canonicalSolution(regions) {
    // Each region is a Set of keys
    // Convert each region to a sorted array, then sort those arrays, then JSON.stringify.
    const regionArrays = regions.map((regionSet) => {
      const arr = Array.from(regionSet).sort();
      return arr;
    });
    // Sort the region arrays themselves in a stable manner
    regionArrays.sort((a, b) => {
      // compare by string or length first
      const aStr = a.join('|');
      const bStr = b.join('|');
      if (aStr < bStr) return -1;
      if (aStr > bStr) return 1;
      return 0;
    });

    return JSON.stringify(regionArrays);
  }

  // -----------
  // RECURSION
  // -----------

  // Main backtracking function
  function backtrack(currentRegions, remainingHexes, winsSoFar) {
    // If no remaining hexes, we've formed a complete partition
    if (remainingHexes.size === 0) {
      // Check if colorToWin has majority
      if (winsSoFar > (totalRegions - winsSoFar)) {
        // Construct a canonical solution
        const solKey = canonicalSolution(currentRegions);
        if (!solutionsSet.has(solKey)) {
          solutionsSet.add(solKey);
          // Make a copy of currentRegions to store in solutionsFound
          solutionsFound.push([...currentRegions]);
        }
      }
      return;
    }

    // If we've already found enough solutions, stop.
    if (solutionsFound.length >= max_solutions) {
      return;
    }

    const regionsFormed = currentRegions.length;
    const regionsLeftToForm = totalRegions - regionsFormed;
    const neededWins = neededWinsSoFar(winsSoFar, neededToWinMajority);

    // Prune if not enough color cells left to form the needed winning regions
    if (maxPossibleWins(remainingHexes, colorToWin, regionSize) < neededWins) {
      // console.log("Pruning: Not enough color left to form needed winning regions.");
      return;
    }

    // Prune if leftover can't be split into regionSize blocks
    if (!canSplitIntoRegionsOfSize(remainingHexes, regionSize)) {
      // console.log("Pruning: leftover hexes can't be split into region_size blocks.");
      return;
    }

    // If we already have more than half the regions (majority),
    // just fill out the rest with any valid partition.
    if (winsSoFar > Math.floor(totalRegions / 2)) {
      fillAllPossibleRegions(currentRegions, remainingHexes, winsSoFar);
      return;
    }

    // Otherwise, we still need more winning regions.
    // Gather all colorToWin hexes from remaining
    const colorToWinCells = [];
    for (const h of remainingHexes) {
      if (hexes[h] === colorToWin) colorToWinCells.push(h);
    }
    if (colorToWinCells.length === 0) {
      // No more colorToWin cells left => can't form a new winning region
      return;
    }

    // Sort so we pick them in a consistent order
    colorToWinCells.sort();

    // Puzzle logic: try each colorToWin cell as a start cell for a winning region
    for (const startCell of colorToWinCells) {
      // All possible winning regions (connected sets of regionSize) that include startCell
      const possibleWinningRegions = generateWinningRegionsFromCell(
        startCell,
        remainingHexes,
        colorToWin,
        regionSize
      );

      if (possibleWinningRegions.length === 0) {
        // Exclude this cell from future tries (remove from remainingHexes) and recurse
        const newRemaining = new Set(remainingHexes);
        newRemaining.delete(startCell);
        backtrack(currentRegions, newRemaining, winsSoFar);
        // After doing that exclusion, return (following the puzzle's logic)
        return;
      } else {
        // If multiple, sort by ascending number of colorToWin cells used
        possibleWinningRegions.sort((a, b) => {
          // count colorToWin cells in each
          let aCount = 0;
          for (const x of a) if (hexes[x] === colorToWin) aCount++;
          let bCount = 0;
          for (const x of b) if (hexes[x] === colorToWin) bCount++;
          return aCount - bCount;
        });

        // Try each possible winning region with startCell
        for (const region of possibleWinningRegions) {
          // region is a Set of keys
          const tentativeRegions = [...currentRegions, region];
          const comboKey = canonicalSolution(tentativeRegions);

          if (testedRegionCombos.has(comboKey)) {
            continue; // skip repeated combos
          }
          testedRegionCombos.add(comboKey);

          // Remove region from leftover
          const newRemaining = new Set(remainingHexes);
          for (const c of region) {
            newRemaining.delete(c);
          }

          // Double-check leftover can still form valid blocks
          if (!canSplitIntoRegionsOfSize(newRemaining, regionSize)) {
            continue;
          }

          // Recurse
          currentRegions.push(region);
          backtrack(currentRegions, newRemaining, winsSoFar + 1);
          currentRegions.pop();

          if (solutionsFound.length >= max_solutions) {
            return;
          }
        }

        // After trying all winning regions from startCell, return (puzzle logic)
        return;
      }
    }
  }

  // Once colorToWin already secured majority, fill out the rest with any valid partition
  function fillAllPossibleRegions(currentRegions, remainingHexes, winsSoFar) {
    if (remainingHexes.size === 0) {
      // Check final majority
      if (winsSoFar > (totalRegions - winsSoFar)) {
        const solKey = canonicalSolution(currentRegions);
        if (!solutionsSet.has(solKey)) {
          solutionsSet.add(solKey);
          solutionsFound.push([...currentRegions]);
        }
      }
      return;
    }

    if (solutionsFound.length >= max_solutions) {
      return;
    }

    if (!canSplitIntoRegionsOfSize(remainingHexes, regionSize)) {
      return;
    }

    // Pick one cell to start a region
    const sortedRemaining = Array.from(remainingHexes).sort();
    const startCell = sortedRemaining[0];

    // Generate all possible contiguous regions of size regionSize that include startCell
    const possibleRegions = generateAllRegionsFromCell(startCell, remainingHexes, regionSize);

    for (const region of possibleRegions) {
      const newRemaining = new Set(remainingHexes);
      for (const c of region) {
        newRemaining.delete(c);
      }
      if (!canSplitIntoRegionsOfSize(newRemaining, regionSize)) {
        continue;
      }

      currentRegions.push(region);
      fillAllPossibleRegions(currentRegions, newRemaining, winsSoFar);
      currentRegions.pop();

      if (solutionsFound.length >= max_solutions) {
        return;
      }
    }
  }

  // Generate all contiguous sets of exactly `size` that include `startHex`,
  // are within `availableHexes`, and have a strict majority for `colorVal`.
  function generateWinningRegionsFromCell(startHex, availableHexes, colorVal, size) {
    const allRegions = new Set();
    // We'll do a DFS-like approach: expand sets up to size
    const stack = [[new Set([startHex])]]; // not strictly needing the array wrapper, but we'll be consistent

    // For de-duplicating partial expansions
    const visitedPaths = new Set();
    visitedPaths.add(JSON.stringify([startHex]));

    // We'll store expansions in "currentSet"
    while (stack.length > 0) {
      const [currentSet] = stack.pop();

      if (currentSet.size === size) {
        // Check majority
        if (majorityCountInRegion(currentSet, colorVal)) {
          // Convert to stable set-of-strings
          allRegions.add(canonicalRegionSet(currentSet));
        }
        continue;
      }

      // Expand from neighbors of all cells in currentSet
      const neighbors = new Set();
      for (const cell of currentSet) {
        for (const nbr of adjacency[cell]) {
          if (availableHexes.has(nbr) && !currentSet.has(nbr)) {
            neighbors.add(nbr);
          }
        }
      }

      for (const nbr of neighbors) {
        const newSet = new Set(currentSet);
        newSet.add(nbr);
        const pathKey = canonicalRegionSet(newSet);
        if (!visitedPaths.has(pathKey)) {
          visitedPaths.add(pathKey);
          stack.push([newSet]);
        }
      }
    }

    // Convert each canonical form back into a real Set
    const results = [];
    for (const regionStr of allRegions) {
      results.push(new Set(JSON.parse(regionStr)));
    }
    return results;
  }

  // Generate all contiguous sets of exactly `size` that include `startHex`
  // and are within `availableHexes` (no majority requirement).
  function generateAllRegionsFromCell(startHex, availableHexes, size) {
    if (size > availableHexes.size) {
      return [];
    }

    const allRegions = new Set();
    const initial = new Set([startHex]);
    const stack = [initial];
    const visitedPartial = new Set();
    visitedPartial.add(canonicalRegionSet(initial));

    while (stack.length > 0) {
      const currentSet = stack.pop();

      if (currentSet.size === size) {
        allRegions.add(canonicalRegionSet(currentSet));
        continue;
      }

      // Expand from neighbors of all cells in currentSet
      const neighbors = new Set();
      for (const cell of currentSet) {
        for (const nbr of adjacency[cell]) {
          if (availableHexes.has(nbr) && !currentSet.has(nbr)) {
            neighbors.add(nbr);
          }
        }
      }

      for (const nbr of neighbors) {
        const newSet = new Set(currentSet);
        newSet.add(nbr);
        const newSetKey = canonicalRegionSet(newSet);
        if (!visitedPartial.has(newSetKey)) {
          visitedPartial.add(newSetKey);
          stack.push(newSet);
        }
      }
    }

    // Convert each canonical form back into real Set
    const results = [];
    for (const regionStr of allRegions) {
      results.push(new Set(JSON.parse(regionStr)));
    }
    return results;
  }

  // Helper to create a canonical string for a Set of hexKeys
  function canonicalRegionSet(aSet) {
    // Sort the keys and JSON.stringify
    const arr = Array.from(aSet).sort();
    return JSON.stringify(arr);
  }

  // -----------
  // RUN SOLVER
  // -----------
  backtrack([], new Set(allKeys), 0);

  // Format final solutions in the desired structure:
  // Each solution is an array of arrays of hexKeys (strings)
  const finalSolutions = solutionsFound.map((sol) => {
    // sol is an array of Sets
    // convert each region to a sorted array
    const regionArrays = sol.map((regionSet) => {
      return Array.from(regionSet).sort();
    });
    // sort the region arrays themselves to have a stable output
    regionArrays.sort((a, b) => {
      const aStr = a.join('|');
      const bStr = b.join('|');
      if (aStr < bStr) return -1;
      if (aStr > bStr) return 1;
      return 0;
    });
    return regionArrays;
  });

  return finalSolutions;
}
