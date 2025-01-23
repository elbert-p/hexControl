/**
 * Returns the 6 cube neighbors of a hex cell at (q, r, s).
 * Cube coordinates always satisfy q + r + s = 0.
 */
function getCubeNeighbors(q, r, s) {
    return [
      { q: q + 1, r: r - 1, s: s     }, // (q+1, r-1, s)
      { q: q + 1, r: r,     s: s - 1 }, // (q+1, r, s-1)
      { q: q,     r: r + 1, s: s - 1 }, // (q,   r+1, s-1)
      { q: q - 1, r: r + 1, s: s     }, // (q-1, r+1, s)
      { q: q - 1, r: r,     s: s + 1 }, // (q-1, r,   s+1)
      { q: q,     r: r - 1, s: s + 1 }, // (q,   r-1, s+1)
    ];
  }
  
  /**
   * Utility to create a string key for storing in a Set or Map.
   */
  function cubeKey(q, r, s) {
    return `${q},${r},${s}`;
  }
  
  /**
   * Generates a connected hex map in cube coordinates.
   *
   * @param {number} cellCount       - Number of hex cells to generate.
   * @param {number} spreadFactor    - Controls the chance of adding neighbors (larger -> more sprawling).
   * @param {number} directionBias   - A value from 0 to 1 controlling an optional directional preference.
   * @param {number} colorRatio      - A value from 0 to 1 (e.g., 0.4 means 40% color=1, 60% color=0).
   * @returns {Array}                - An array of objects { q, r, s, color }, connected cluster.
   */
  export default function generateMapData(
    cellCount = 50,
    spreadFactor = 0.5,
    directionBias = 0.0,
    colorRatio = 0.5
  ) {
    // We’ll store visited hexes in a Set for quick lookups.
    const visited = new Set();
    
    // We’ll also keep an array of "frontier" cells that we can expand from.
    const frontier = [];
    
    // Start from (0,0,0) in cube coordinates
    frontier.push({ q: 0, r: 0, s: 0 });
    visited.add(cubeKey(0, 0, 0));
    
    // If you want to bias expansions in a certain direction, you can define it here:
    // For example, pick one of the 6 directions to favor
    // We’ll store them in an array if directionBias > 0
    const biasDirections = [
      { dq: 1,  dr: -1, ds: 0  }, // east-northeast
      { dq: 1,  dr: 0,  ds: -1 }, // east
      { dq: 0,  dr: 1,  ds: -1 }, // southeast
      { dq: -1, dr: 1,  ds: 0  }, // southwest
      { dq: -1, dr: 0,  ds: 1  }, // west
      { dq: 0,  dr: -1, ds: 1  }, // northwest
    ];
    
    // Keep going until we have the desired number of cells
    while (visited.size < cellCount) {
      // If frontier is empty (pathological case), break out—no more expansions possible
      if (frontier.length === 0) {
        break;
      }
      
      // Pick a random cell from the frontier
      const randomIndex = Math.floor(Math.random() * frontier.length);
      const current = frontier[randomIndex];
      
      // Remove it from the frontier so we don’t add duplicates repeatedly
      frontier.splice(randomIndex, 1);
      
      // Expand to neighbors with some probability
      const neighbors = getCubeNeighbors(current.q, current.r, current.s);
      
      neighbors.forEach(neighbor => {
        const key = cubeKey(neighbor.q, neighbor.r, neighbor.s);
        
        // Only consider if not already visited
        if (!visited.has(key)) {
          // Weighted chance: base chance is spreadFactor
          // If directionBias is used, we add an extra nudge for expansions
          // that align with a certain direction
          let chance = spreadFactor;
          
          // Optional direction bias: if the vector from current to neighbor
          // matches your "favored" direction, you might increase the chance
          if (directionBias > 0) {
            // Check which direction neighbor is from current
            const dq = neighbor.q - current.q;
            const dr = neighbor.r - current.r;
            const ds = neighbor.s - current.s;
            
            // Compare with each bias direction
            biasDirections.forEach(dir => {
              if (dir.dq === dq && dir.dr === dr && dir.ds === ds) {
                chance += directionBias; // increase the chance
              }
            });
          }
          
          if (Math.random() < chance) {
            // Mark visited, add to frontier
            visited.add(key);
            frontier.push(neighbor);
          }
        }
      });
      
      // Keep looping until we fill up the required cells
      // (some expansions won't add new cells if they're already visited)
    }
    
    // Now we have a visited set of size up to cellCount
    // If for some reason we have fewer than cellCount (due to unlucky expansions),
    // it just means we couldn't expand further without disconnecting.
    // We’ll slice it to the first cellCount in case it overshoots (unlikely).
    
    const visitedArray = Array.from(visited).map(key => {
      const [q, r, s] = key.split(',').map(Number);
      return { q, r, s };
    });
    
    // If we have more than cellCount, truncate randomly or from the end.
    // (Typically it shouldn’t exceed if we stop once visited.size >= cellCount.)
    if (visitedArray.length > cellCount) {
      visitedArray.splice(cellCount);
    }
    
    // Assign colors according to colorRatio
    //  color = 1 with probability colorRatio, else 0
    visitedArray.forEach(hex => {
      hex.color = Math.random() < colorRatio ? 1 : 0;
    });
    
    // Return the final array of { q, r, s, color }
    return visitedArray;
  }
  
//   // Example usage:
//   const exampleMap = generateMapData(
//     /* cellCount */    50,
//     /* spreadFactor */ 0.55,
//     /* directionBias */0.1,
//     /* colorRatio */   0.4
//   );
  
//   console.log(exampleMap);
  