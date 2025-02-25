/************************************************************
 * hardPuzzleGA.js
 * 
 * A Genetic Algorithm approach to find a puzzle with:
 *   - 1 <= (#solutions) < maxSolutions
 *   - For each valid solution, we calculate "outside edges"
 *     for each region. Summing these perimeters across the
 *     solution, then dividing by the total # hexes => that
 *     solution’s edges-per-hex average. 
 *   - We want the LOWEST such edges/hex among all solutions 
 *     to be > difficultyThreshold. 
 * 
 * Dependencies:
 *   - generateMapData.js   (makes the connected shape)
 *   - solvePuzzle.js       (finds puzzle solutions)
 * 
 * Usage:
 *   import hardPuzzleGeneratorGA from './hardPuzzleGA.js';
 *   const result = hardPuzzleGeneratorGA({
 *     cellCount: 50,
 *     regionSize: 7,
 *     colorToWin: 1,
 *     maxSolutions: 5,
 *     difficultyThreshold: 5,
 *     populationSize: 20,
 *     maxGenerations: 50,
 *     mutationRate: 0.01
 *   });
 * 
 *   if (result) {
 *     console.log('Puzzle found:', result);
 *   } else {
 *     console.log('No suitable puzzle found');
 *   }
 ************************************************************/

import generateMapData from './generateMapData.js';
import solvePuzzle from './solvePuzzle.js';

/**
 * Build adjacency for a map: hexKey -> array of neighbor hexKeys.
 * We'll use this to figure out if two cells share an edge (for perimeter).
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

  // Convert mapData into a quick dictionary: key -> color
  const hexDict = {};
  for (const cell of mapData) {
    const { q, r, s } = cell;
    const key = `${q},${r},${s}`;
    hexDict[key] = cell.color;
  }

  // Build adjacency
  const adjacency = {};
  const allKeys = Object.keys(hexDict);

  for (const key of allKeys) {
    const [q, r, s] = key.split(',').map(Number);
    const neighbors = [];
    for (const [dq, dr, ds] of neighborDirs) {
      const nq = q + dq;
      const nr = r + dr;
      const ns = s + ds;
      const nbrKey = `${nq},${nr},${ns}`;
      if (hexDict.hasOwnProperty(nbrKey)) {
        neighbors.push(nbrKey);
      }
    }
    adjacency[key] = neighbors;
  }

  return adjacency;
}

/**
 * Compute the "outside perimeter" of a single region:
 *   - Start with (6 * number_of_hexes_in_region)
 *   - Subtract 2 for each shared edge among pairs of adjacent hexes in that region.
 *
 * E.g. a single hex has 6 edges; 2 adjacent hexes share 1 boundary => total perimeter 10.
 */
function computeRegionPerimeter(regionHexKeys, adjacencyMap) {
  // regionHexKeys is an array of hexKeys
  // Convert to a Set for O(1) membership checks
  const regionSet = new Set(regionHexKeys);
  const regionSize = regionHexKeys.length;

  let perimeter = 6 * regionSize; // each hex contributes 6 if isolated

  // Count how many adjacency boundaries exist inside the region
  // Each adjacency boundary is counted as an "edge" that no longer belongs
  // to the outside perimeter, but we have to subtract 2 from the total
  // because each boundary is counted for both hexes in perimeter = 6*N.
  let internalBoundaries = 0;

  for (const hexKey of regionHexKeys) {
    const nbrList = adjacencyMap[hexKey] || [];
    // We'll only count "internal adjacency" in a consistent way
    for (const nbr of nbrList) {
      if (regionSet.has(nbr)) {
        // We found an adjacency inside the region.
        // To avoid double-counting, only count it if hexKey < nbr in lexical order
        if (hexKey < nbr) {
          internalBoundaries += 1;
        }
      }
    }
  }

  // Each internal boundary => minus 2 from perimeter
  perimeter -= (2 * internalBoundaries);

  return perimeter;
}

/**
 * For a single solution (which is an array of regions, 
 * each region = array of hexKeys):
 *   1) Compute each region's perimeter
 *   2) Sum those perimeters = total perimeter
 *   3) Edges per hex = total perimeter / totalHexesInPuzzle
 */
function computeEdgesPerHexForSolution(solution, adjacencyMap, totalHexCount) {
  let totalPerimeter = 0;
  for (const region of solution) {
    totalPerimeter += computeRegionPerimeter(region, adjacencyMap);
  }

  return totalPerimeter / totalHexCount;
}

/**
 * We interpret the puzzle's "hardness" measure as the 
 * **lowest** edges-per-hex among all solutions. 
 * If a puzzle has multiple solutions, we want them *all* 
 * to have a high perimeter average.
 *
 * If no solutions, return 0 (or negative) by convention.
 */
function computeLowestEdgesPerHexAmongSolutions(mapData, solutions) {
  if (!solutions || solutions.length === 0) {
    return 0;
  }
  const adjacencyMap = buildAdjacency(mapData);
  const totalHexCount = mapData.length;

  let minVal = Infinity;
  for (const sol of solutions) {
    const val = computeEdgesPerHexForSolution(sol, adjacencyMap, totalHexCount);
    if (val < minVal) {
      minVal = val;
    }
  }
  return minVal;
}

/**
 * A bounding solve: calls solvePuzzle(...) with max_solutions = `bound`.
 * - If solutions.length == 0 => no solutions
 * - If solutions.length == bound => interpret as ">= bound" (the solver short-circuited)
 * - Otherwise => we have fewer than `bound` solutions
 */
function solvePuzzleBound(mapData, regionSize, colorToWin, bound) {
  const solutions = solvePuzzle(mapData, colorToWin, regionSize, bound);

  if (solutions.length === 0) {
    return { solutionCount: 0, solutionsArray: [] };
  }
  else if (solutions.length >= bound) {
    // Means "we have at least 'bound' solutions"
    return { solutionCount: -1, solutionsArray: [] };
  }
  else {
    return { solutionCount: solutions.length, solutionsArray: solutions };
  }
}

/**
 * Convert mapData -> bit array
 */
function mapDataToGenome(mapData) {
  return mapData.map(c => c.color);
}

/**
 * Apply genome (bit array) to base shape
 */
function applyGenomeToMapData(genome, baseMapData) {
  return baseMapData.map((cell, i) => ({
    q: cell.q,
    r: cell.r,
    s: cell.s,
    color: genome[i],
  }));
}

/**
 * Generate random bit array of length n
 */
function randomGenome(n) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    arr.push(Math.random() < 0.5 ? 1 : 0);
  }
  return arr;
}

/**
 * 1-point crossover
 */
function crossover(gA, gB) {
  const cut = Math.floor(Math.random() * gA.length);
  return [
    ...gA.slice(0, cut),
    ...gB.slice(cut)
  ];
}

/**
 * Flip bits with probability mutationRate
 */
function mutate(genome, mutationRate) {
  const out = genome.slice();
  for (let i = 0; i < out.length; i++) {
    if (Math.random() < mutationRate) {
      out[i] = (out[i] === 0 ? 1 : 0);
    }
  }
  return out;
}

/**
 * Compute a numeric "fitness":
 *   1) Solve puzzle with bounding = maxSolutions
 *   2) Must have 1 <= solutions < maxSolutions
 *   3) Then compute the puzzle's "lowest edges-per-hex" across all solutions
 *   4) If that is below difficultyThreshold => penalty
 *   5) Otherwise => reward
 */
function computeFitness(genome, baseMapData, regionSize, colorToWin, maxSolutions, difficultyThreshold) {
  const puzzle = applyGenomeToMapData(genome, baseMapData);
  const { solutionCount, solutionsArray } = solvePuzzleBound(puzzle, regionSize, colorToWin, maxSolutions);

  // Unsolvable => big penalty
  if (solutionCount === 0) {
    return -1000;
  }
  // Too many solutions => also penalty
  if (solutionCount === -1) {
    return -500;
  }
  // Now 1 <= solutionCount < maxSolutions

  // Compute the "lowest" edges/hex among these solutions
  const minEdgesVal = computeLowestEdgesPerHexAmongSolutions(puzzle, solutionsArray);

  // If below threshold => partial penalty
  if (minEdgesVal < difficultyThreshold) {
    // The further below threshold, the bigger penalty
    // For example, difference * 50. 
    // If difference is negative, that yields negative. 
    return (minEdgesVal - difficultyThreshold) * 50; 
  }

  // It's above threshold => good
  // The puzzle is valid. We might encourage "higher is better" if desired:
  // We'll do a base reward + some bonus for how high above threshold we are
  const baseScore = 300;
  const edgesBonus = (minEdgesVal - difficultyThreshold) * 20;
  // Possibly penalize bigger solutionCount, 
  // because fewer solutions might be "harder"
  const solutionCountPenalty = (solutionCount - 1) * 5;

  return baseScore + edgesBonus - solutionCountPenalty;
}

/**
 * The main GA-based puzzle generator. We:
 *  - Generate a base shape
 *  - Evolve color assignments
 *  - Return a puzzle with 1..(maxSolutions-1) solutions
 *    and "lowest edges/hex" across solutions > difficultyThreshold.
 */
export default function hardPuzzleGeneratorGA({
  cellCount = 50,
  regionSize = 7,
  colorToWin = 1,
  maxSolutions = 5,
  difficultyThreshold = 5,
  populationSize = 20,
  maxGenerations = 50,
  mutationRate = 0.01,
} = {}) {
  // 1) Generate a shape (positions only); ignore its color 
  const initialShape = generateMapData(
    cellCount,
    0.6,  // spreadFactor for more branching
    0.1,  // directionBias
    0.5   // color ratio placeholder
  );

  // "Base" map is shape with color=0, to be overridden by genome
  const baseMapData = initialShape.map(c => ({
    q: c.q, r: c.r, s: c.s, color: 0
  }));
  const genomeLength = baseMapData.length;

  // 2) Init population
  let population = [];
  for (let i = 0; i < populationSize; i++) {
    population.push(randomGenome(genomeLength));
  }

  let bestGenome = null;
  let bestFitness = -Infinity;
  let bestInfo = {
    solutionCount: 0,
    minEdgesPerHex: 0,
    solutions: []
  };

  // 3) GA main loop
  for (let gen = 0; gen < maxGenerations; gen++) {
    // Evaluate fitness for each
    const fitnesses = population.map(g => {
      return computeFitness(
        g, 
        baseMapData,
        regionSize,
        colorToWin,
        maxSolutions,
        difficultyThreshold
      );
    });

    // Track best
    for (let i = 0; i < populationSize; i++) {
      if (fitnesses[i] > bestFitness) {
        bestFitness = fitnesses[i];
        bestGenome = population[i];

        // Re-check how many solutions, and what's the minEdges
        const puzzle = applyGenomeToMapData(bestGenome, baseMapData);
        const { solutionCount, solutionsArray } = solvePuzzleBound(puzzle, regionSize, colorToWin, maxSolutions);

        let minEdgesVal = 0;
        if (solutionCount > 0 && solutionCount < maxSolutions) {
          minEdgesVal = computeLowestEdgesPerHexAmongSolutions(puzzle, solutionsArray);
        }

        bestInfo = {
          solutionCount,
          minEdgesPerHex: minEdgesVal,
          solutions: solutionsArray
        };
      }
    }

    // Check if best is "good enough"
    if (
      bestInfo.solutionCount >= 1 &&
      bestInfo.solutionCount < maxSolutions &&
      bestInfo.minEdgesPerHex >= difficultyThreshold
    ) {
      // Return puzzle
      return {
        mapData: applyGenomeToMapData(bestGenome, baseMapData),
        solutions: bestInfo.solutions,
        edgesPerHex: bestInfo.minEdgesPerHex,  // The "lowest" across solutions
        solutionCount: bestInfo.solutionCount,
        generation: gen,
        fitness: bestFitness
      };
    }

    // Selection: pick top half
    const ranked = fitnesses.map((f, i) => ({ f, i }))
                           .sort((a, b) => b.f - a.f);
    const half = Math.floor(populationSize / 2);
    const matingPool = [];
    for (let i = 0; i < half; i++) {
      matingPool.push(population[ranked[i].i]);
    }

    // Reproduction
    const newPop = [];
    while (newPop.length < populationSize) {
      const p1 = matingPool[Math.floor(Math.random() * matingPool.length)];
      const p2 = matingPool[Math.floor(Math.random() * matingPool.length)];
      const child = crossover(p1, p2);
      const mutatedChild = mutate(child, mutationRate);
      newPop.push(mutatedChild);
    }
    population = newPop;
  }

  // 4) If we exhaust generations, see if the best found meets specs
  if (
    bestInfo.solutionCount >= 1 &&
    bestInfo.solutionCount < maxSolutions &&
    bestInfo.minEdgesPerHex >= difficultyThreshold
  ) {
    return {
      mapData: applyGenomeToMapData(bestGenome, baseMapData),
      solutions: bestInfo.solutions,
      edgesPerHex: bestInfo.minEdgesPerHex,
      solutionCount: bestInfo.solutionCount,
      generation: maxGenerations,
      fitness: bestFitness
    };
  }

  // Otherwise, no puzzle found
  return null;
}
