// solvePuzzle.js

/**
 * Solve a "gerrymandering hex puzzle" by partitioning all cells into
 * connected groups of size `groupSize`. A group is considered a "win"
 * for the wanted color only if wantedColorCount > otherColorCount.
 * The final partition must have strictly more "win" groups for wantedColor
 * than "win" groups for the other color.
 *
 * @param {Array} puzzleData - array of { q, r, s, color }
 * @param {number} groupSize - number of cells per group (e.g., 7)
 * @param {number} wantedColor - the color to have majority in groups (0 or 1)
 * @param {boolean} returnAfterFirst - if true, return after finding the first valid solution
 * @returns {Array<Array<Group>>} Array of solutions; each solution is an array of group objects:
 *   [
 *     { cells: [key, key, ...], countWanted: X, countOther: Y },
 *     { ... },
 *     ...
 *   ]
 */
export default function solvePuzzle(puzzleData, groupSize = 7, wantedColor = 1, returnAfterFirst = false) {
  // console.log("=== Starting Puzzle Solver ===");
  // console.log(`Total cells: ${puzzleData.length}`);
  // console.log(`Group size: ${groupSize}`);
  // console.log(`Wanted color: ${wantedColor}`);
  // console.log(`Return after first solution: ${returnAfterFirst}`);
  
  // Quick check: if total cells is not a multiple of groupSize, no solution possible.
  if (puzzleData.length % groupSize !== 0) {
    // console.warn(
    //   `❌ Total cells (${puzzleData.length}) is not divisible by group size (${groupSize}). No solutions possible.`
    // );
    return [];
  }

  // 1) Build adjacency map and store color
  const hexMap = buildHexMap(puzzleData);
  // console.log("✅ Built hex map with adjacency information.");

  // 2) All cell keys start as unused
  const allCellKeys = Object.keys(hexMap).sort(); // Sort for consistent ordering
  const unusedCells = new Set(allCellKeys);
  // console.log(`🔓 Initialized unused cells: ${unusedCells.size} cells.`);

  // 3) We'll collect all valid partitions here
  const validSolutions = [];
  const seenSolutions = new Set(); // To track unique solutions

  // 4) Context object to manage early exit
  const context = {
    found: false,      // Indicates if a desired solution has been found
    solution: null,    // Stores the first found solution if returnAfterFirst is true
  };

  // 5) Use backtracking to cover all cells
  const currentPartition = []; // an array of group objects
  backtrackPartition(
    hexMap,
    unusedCells,
    groupSize,
    currentPartition,
    validSolutions,
    seenSolutions,
    wantedColor,
    context,
    returnAfterFirst
  );

  // console.log(`🔍 Backtracking complete. Found ${validSolutions.length} valid solutions.`);

  // console.log("=== Puzzle Solver Finished ===");
  return validSolutions;
}

/**
 * Build adjacency: cellKey -> { color, neighbors: Set<cellKey> }.
 * Each puzzleData entry has .q, .r, .s, .color.
 * Hex adjacency (pointy-top) for (q,r,s) includes:
 *   (q+1, r-1, s), (q+1, r, s-1), (q, r+1, s-1)
 *   (q-1, r+1, s), (q-1, r, s+1), (q, r-1, s+1)
 */
function buildHexMap(puzzleData) {
  const hexMap = {};
  // Insert all cells into a map
  puzzleData.forEach((h) => {
    const k = keyOf(h.q, h.r, h.s);
    hexMap[k] = {
      color: h.color,
      neighbors: new Set(),
    };
  });

  // For each cell, find neighbors
  puzzleData.forEach((h) => {
    const k = keyOf(h.q, h.r, h.s);
    const potentialNeighbors = [
      [h.q + 1, h.r - 1, h.s],
      [h.q + 1, h.r, h.s - 1],
      [h.q, h.r + 1, h.s - 1],
      [h.q - 1, h.r + 1, h.s],
      [h.q - 1, h.r, h.s + 1],
      [h.q, h.r - 1, h.s + 1],
    ];
    potentialNeighbors.forEach(([qq, rr, ss]) => {
      const nk = keyOf(qq, rr, ss);
      if (nk in hexMap) {
        hexMap[k].neighbors.add(nk);
      }
    });
  });

  return hexMap;
}

function keyOf(q, r, s) {
  return `${q},${r},${s}`;
}

/**
 * Recursive backtracking to partition cells into connected groups.
 *
 * @param {Object} hexMap - cellKey -> { color, neighbors: Set<cellKey> }
 * @param {Set<string>} unusedCells - set of cellKeys not yet assigned to any group
 * @param {number} groupSize - desired size of each group
 * @param {Array} currentPartition - current list of groups
 * @param {Array} validSolutions - collector for all valid partitions
 * @param {Set<string>} seenSolutions - Set to track unique solutions
 * @param {number} wantedColor - the color we want to have majority in groups
 * @param {Object} context - object to manage early exit
 * @param {boolean} returnAfterFirst - flag to indicate if the solver should stop after finding the first solution
 */
function backtrackPartition(
  hexMap,
  unusedCells,
  groupSize,
  currentPartition,
  validSolutions,
  seenSolutions,
  wantedColor,
  context,
  returnAfterFirst
) {
  // Early exit if a desired solution has been found
  if (context.found) {
    return;
  }

  // Base case: if no unused cells remain, we have a complete partition
  if (unusedCells.size === 0) {
    // Evaluate if the current partition meets the winning condition
    let wantedMajorityCount = 0;
    let otherMajorityCount = 0;
    currentPartition.forEach((grp) => {
      if (grp.countWanted > grp.countOther) wantedMajorityCount++;
      else if (grp.countOther > grp.countWanted) otherMajorityCount++;
      // ties are ignored
    });

    if (wantedMajorityCount > otherMajorityCount) {
      // Create a canonical string representation of the solution
      // 1. Sort the cells within each group
      const sortedGroups = currentPartition.map(grp => ({
        cells: [...grp.cells].sort(),
        countWanted: grp.countWanted,
        countOther: grp.countOther,
      }));

      // 2. Sort the groups based on the first cell key
      sortedGroups.sort((a, b) => {
        const aFirst = a.cells[0];
        const bFirst = b.cells[0];
        return aFirst.localeCompare(bFirst);
      });

      // 3. Convert the sorted groups to a string
      const solutionString = JSON.stringify(sortedGroups.map(grp => grp.cells));

      // 4. Check if this solution has already been seen
      if (!seenSolutions.has(solutionString)) {
        seenSolutions.add(solutionString);
        validSolutions.push(sortedGroups);
        // console.log(`🎉 Valid solution #${validSolutions.length} found.`);

        // If only the first solution is needed, set the found flag and store the solution
        if (returnAfterFirst) {
          context.found = true;
          context.solution = sortedGroups;
        }
      }
    }
    return;
  }

  // Pick the first unused cell as the starting point (sorted order)
  const startCell = Array.from(unusedCells).sort()[0];
  // console.log(`🔍 Attempting to create a group starting with cell: ${startCell}`);

  // Find all connected subsets of size groupSize that include startCell
  const possibleGroups = findConnectedSubsetsOfSize(
    startCell,
    groupSize,
    hexMap,
    unusedCells
  );

  // console.log(`📚 Found ${possibleGroups.length} possible groups starting with ${startCell}.`);

  if (possibleGroups.length === 0) {
    // console.warn(`⚠️ No possible groups found starting with ${startCell}. Backtracking.`);
    return; // Dead end, backtrack
  }

  // Iterate over each possible group
  for (let groupSet of possibleGroups) {
    // console.log(`➡️ Trying group with cells: ${Array.from(groupSet).join(", ")}`);

    // Count colors in the group
    let countWanted = 0;
    let countOther = 0;
    groupSet.forEach((ck) => {
      if (hexMap[ck].color === wantedColor) countWanted++;
      else countOther++;
    });

    // console.log(`🎨 Group color counts - Wanted (${wantedColor}): ${countWanted}, Other: ${countOther}`);

    // Create group object
    const groupObj = {
      cells: Array.from(groupSet),
      countWanted,
      countOther,
    };

    // Assign group: remove cells from unused and add to current partition
    groupSet.forEach((ck) => unusedCells.delete(ck));
    currentPartition.push(groupObj);
    // console.log(`📦 Assigned group. Remaining unused cells: ${unusedCells.size}`);

    // Recurse
    backtrackPartition(
      hexMap,
      unusedCells,
      groupSize,
      currentPartition,
      validSolutions,
      seenSolutions,
      wantedColor,
      context,
      returnAfterFirst
    );

    // If a solution has been found and we are returning after first, exit early
    if (context.found) {
      return;
    }

    // Backtrack: remove group and re-add cells to unused
    currentPartition.pop();
    groupSet.forEach((ck) => unusedCells.add(ck));
    // console.log(`↩️ Backtracked from group. Restored unused cells: ${unusedCells.size}`);
  }
}

/**
 * Find all connected subsets of size `groupSize` that include `startKey`,
 * restricted to cells in `unusedCells`.
 *
 * @param {string} startKey - the starting cell key
 * @param {number} groupSize - desired size of the group
 * @param {Object} hexMap - cellKey -> { color, neighbors: Set<cellKey> }
 * @param {Set<string>} unusedCells - set of cellKeys not yet assigned to any group
 * @returns {Array<Set<string>>} Array of sets, each representing a possible group
 */
function findConnectedSubsetsOfSize(startKey, groupSize, hexMap, unusedCells) {
  const results = [];
  const stack = [
    {
      set: new Set([startKey]),
      frontier: Array.from(hexMap[startKey].neighbors).filter((n) =>
        unusedCells.has(n)
      ),
    },
  ];

  while (stack.length > 0) {
    const { set: currentSet, frontier } = stack.pop();

    // If we've reached the desired group size, add to results
    if (currentSet.size === groupSize) {
      results.push(currentSet);
      continue;
    }

    // Iterate over the frontier to expand the current set
    for (let i = 0; i < frontier.length; i++) {
      const nbr = frontier[i];
      if (currentSet.has(nbr)) continue;

      // Create a new set including the neighbor
      const newSet = new Set(currentSet);
      newSet.add(nbr);

      // Create a new frontier: remaining cells after the current neighbor to avoid duplicates
      const newFrontier = frontier.slice(i + 1).filter(
        (f) => unusedCells.has(f) && !newSet.has(f)
      );

      // Add new neighbors from the added cell
      hexMap[nbr].neighbors.forEach((nn) => {
        if (
          unusedCells.has(nn) &&
          !newSet.has(nn) &&
          !newFrontier.includes(nn)
        ) {
          newFrontier.push(nn);
        }
      });

      // Push the new state onto the stack
      stack.push({
        set: newSet,
        frontier: newFrontier,
      });
    }
  }

  // console.log(`📈 Connected subsets found: ${results.length}`);
  return results;
}
