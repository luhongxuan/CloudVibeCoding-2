import { AlgorithmType, AnimationStep, CellData, CellType, Coordinate } from "../types";

// --- Helpers ---

const getNeighbors = (grid: CellData[][], current: Coordinate): Coordinate[] => {
  const { x, y } = current;
  const rows = grid.length;
  const cols = grid[0].length;
  const neighbors: Coordinate[] = [];
  
  const dirs = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];

  for (const d of dirs) {
    const nx = x + d.x;
    const ny = y + d.y;
    if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
      if (grid[ny][nx].type !== CellType.WALL) {
        neighbors.push({ x: nx, y: ny });
      }
    }
  }
  return neighbors;
};

const heuristic = (a: Coordinate, b: Coordinate): number => {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

const toKey = (c: Coordinate) => `${c.x},${c.y}`;
const fromKey = (k: string): Coordinate => {
  const [x, y] = k.split(',').map(Number);
  return { x, y };
};

const reconstructPath = (parentMap: Map<string, string>, endKey: string): Coordinate[] => {
  const path: Coordinate[] = [];
  let curr: string | undefined = endKey;
  while (curr) {
    path.unshift(fromKey(curr));
    curr = parentMap.get(curr);
  }
  return path;
};

// --- Generators ---

// 1. BFS Generator
function* bfsGenerator(grid: CellData[][], start: Coordinate, end: Coordinate): Generator<AnimationStep> {
  const queue: Coordinate[] = [start];
  const visitedSet = new Set<string>();
  const parentMap = new Map<string, string>();
  
  visitedSet.add(toKey(start));

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentKey = toKey(current);

    if (current.x === end.x && current.y === end.y) {
      yield { 
        visited: Array.from(visitedSet).map(fromKey), 
        frontier: [], 
        path: reconstructPath(parentMap, currentKey) 
      };
      return;
    }

    yield { 
      visited: Array.from(visitedSet).map(fromKey), 
      frontier: [...queue], 
      path: [],
      current 
    };

    const neighbors = getNeighbors(grid, current);
    for (const n of neighbors) {
      const nKey = toKey(n);
      if (!visitedSet.has(nKey)) {
        visitedSet.add(nKey);
        parentMap.set(nKey, currentKey);
        queue.push(n);
      }
    }
  }
}

// 2. DFS Generator
function* dfsGenerator(grid: CellData[][], start: Coordinate, end: Coordinate): Generator<AnimationStep> {
  const stack: Coordinate[] = [start];
  const visitedSet = new Set<string>();
  const parentMap = new Map<string, string>();
  
  visitedSet.add(toKey(start));

  while (stack.length > 0) {
    const current = stack.pop()!;
    const currentKey = toKey(current);

    if (current.x === end.x && current.y === end.y) {
      yield { 
        visited: Array.from(visitedSet).map(fromKey), 
        frontier: [], 
        path: reconstructPath(parentMap, currentKey) 
      };
      return;
    }

    yield { 
      visited: Array.from(visitedSet).map(fromKey), 
      frontier: [...stack], 
      path: reconstructPath(parentMap, currentKey), // Show current path for DFS
      current 
    };

    const neighbors = getNeighbors(grid, current);
    // Reverse neighbors to preserve natural order when popping from stack
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const n = neighbors[i];
      const nKey = toKey(n);
      if (!visitedSet.has(nKey)) {
        visitedSet.add(nKey);
        parentMap.set(nKey, currentKey);
        stack.push(n);
      }
    }
  }
}

// 3. Weighted Search (Dijkstra, A*, Greedy)
// Config allows reusing logic for all priority-based searches
interface WeightedConfig {
  usePathCost: boolean; // If true, adds 'g' to priority (Dijkstra, A*)
  heuristicWeight: number; // Multiplier for 'h' (0 for Dijkstra, 1 for A*, 1+ for Greedy/others)
}

function* weightedSearchGenerator(
  grid: CellData[][], 
  start: Coordinate, 
  end: Coordinate, 
  config: WeightedConfig
): Generator<AnimationStep> {
  // Simple priority queue using array sorting (optimization possible with heap)
  const pq: { coord: Coordinate, priority: number, g: number }[] = [];
  const distMap = new Map<string, number>(); // Stores 'g' cost
  const parentMap = new Map<string, string>();
  const visitedSet = new Set<string>();

  const startKey = toKey(start);
  distMap.set(startKey, 0);
  pq.push({ coord: start, priority: 0, g: 0 });

  while (pq.length > 0) {
    // Pop lowest priority
    pq.sort((a, b) => a.priority - b.priority);
    const { coord: current, g: currentG } = pq.shift()!;
    const currentKey = toKey(current);

    if (visitedSet.has(currentKey)) continue;
    visitedSet.add(currentKey);

    if (current.x === end.x && current.y === end.y) {
      yield { 
        visited: Array.from(visitedSet).map(fromKey), 
        frontier: [], 
        path: reconstructPath(parentMap, currentKey) 
      };
      return;
    }

    yield { 
      visited: Array.from(visitedSet).map(fromKey), 
      frontier: pq.map(i => i.coord), 
      path: [],
      current 
    };

    const neighbors = getNeighbors(grid, current);
    for (const n of neighbors) {
      const nKey = toKey(n);
      if (visitedSet.has(nKey)) continue;

      const newG = currentG + 1; // Assuming uniform edge cost of 1
      const existingG = distMap.get(nKey) ?? Infinity;

      if (newG < existingG) {
        distMap.set(nKey, newG);
        parentMap.set(nKey, currentKey);
        
        // Priority Calculation
        // Dijkstra: g (heuristicWeight=0)
        // A*: g + h
        // Greedy: h (usePathCost=false)
        const h = heuristic(n, end);
        const priority = (config.usePathCost ? newG : 0) + (config.heuristicWeight * h);
        
        pq.push({ coord: n, priority, g: newG });
      }
    }
  }
}

// 4. Bidirectional BFS
function* bidirectionalGenerator(grid: CellData[][], start: Coordinate, end: Coordinate): Generator<AnimationStep> {
  const startQueue: Coordinate[] = [start];
  const endQueue: Coordinate[] = [end];
  
  const startVisited = new Map<string, string>(); // key -> parentKey
  const endVisited = new Map<string, string>();   // key -> parentKey
  
  // Initialize
  startVisited.set(toKey(start), ""); // Root has no parent
  endVisited.set(toKey(end), "");

  while (startQueue.length > 0 && endQueue.length > 0) {
    // --- Expand Start Side ---
    if (startQueue.length > 0) {
      const currStart = startQueue.shift()!;
      const currStartKey = toKey(currStart);
      
      // Check intersection
      if (endVisited.has(currStartKey)) {
        // Paths meet!
        const pathStart = reconstructPath(startVisited, currStartKey); // Start -> Meeting
        // For end part: Meeting -> End (Need to reverse parent pointers logic or just trace)
        // reconstructPath traces CHILD -> PARENT.
        // endVisited stores End -> ... -> Meeting.
        // So reconstructPath(endVisited, currStartKey) gives Meeting -> ... -> End (in reverse order of traversal, i.e., End is root)
        const pathEnd = reconstructPath(endVisited, currStartKey);
        // pathEnd is [Meeting, ..., End]
        // pathStart is [Start, ..., Meeting]
        // Merge: [Start ... Meeting ... End]
        const fullPath = [...pathStart, ...pathEnd.slice(1).reverse()]; // Reverse pathEnd to go Meeting -> End
        
        yield {
          visited: [...Array.from(startVisited.keys()).map(fromKey), ...Array.from(endVisited.keys()).map(fromKey)],
          frontier: [],
          path: fullPath
        };
        return;
      }
      
      const neighbors = getNeighbors(grid, currStart);
      for (const n of neighbors) {
        const nKey = toKey(n);
        if (!startVisited.has(nKey)) {
          startVisited.set(nKey, currStartKey);
          startQueue.push(n);
        }
      }
    }

    // --- Expand End Side ---
    if (endQueue.length > 0) {
      const currEnd = endQueue.shift()!;
      const currEndKey = toKey(currEnd);

      // Check intersection
      if (startVisited.has(currEndKey)) {
        const pathStart = reconstructPath(startVisited, currEndKey);
        const pathEnd = reconstructPath(endVisited, currEndKey);
        const fullPath = [...pathStart, ...pathEnd.slice(1).reverse()];

        yield {
           visited: [...Array.from(startVisited.keys()).map(fromKey), ...Array.from(endVisited.keys()).map(fromKey)],
           frontier: [],
           path: fullPath
        };
        return;
      }

      const neighbors = getNeighbors(grid, currEnd);
      for (const n of neighbors) {
        const nKey = toKey(n);
        if (!endVisited.has(nKey)) {
          endVisited.set(nKey, currEndKey);
          endQueue.push(n);
        }
      }
    }

    // Yield State
    yield {
      visited: [...Array.from(startVisited.keys()).map(fromKey), ...Array.from(endVisited.keys()).map(fromKey)],
      frontier: [...startQueue, ...endQueue],
      path: []
    };
  }
}

// 5. IDA* Generator
function* idaStarGenerator(grid: CellData[][], start: Coordinate, end: Coordinate): Generator<AnimationStep> {
  let bound = heuristic(start, end);
  const pathStack: Coordinate[] = [start];
  const visitedKeys = new Set<string>(); // Global visited for visualization only (strictly IDA* is stateless between bounds, but we want to show progress)
  
  visitedKeys.add(toKey(start));

  while (true) {
    let minPruned = Infinity;
    
    // Recursive DFS generator helper
    function* search(node: Coordinate, g: number): Generator<any, { found: boolean, cost: number }> {
      const f = g + heuristic(node, end);
      
      if (f > bound) {
        return { found: false, cost: f };
      }
      
      if (node.x === end.x && node.y === end.y) {
        return { found: true, cost: f };
      }

      let min = Infinity;
      const neighbors = getNeighbors(grid, node);
      
      // Sort neighbors by heuristic for better performance/visualization (optional)
      neighbors.sort((a, b) => heuristic(a, end) - heuristic(b, end));

      for (const n of neighbors) {
        // Avoid cycles in current path
        if (pathStack.some(p => p.x === n.x && p.y === n.y)) continue;

        pathStack.push(n);
        visitedKeys.add(toKey(n));

        yield {
          visited: Array.from(visitedKeys).map(fromKey),
          frontier: [n],
          path: [...pathStack], // Show current recursion stack as path
          current: n
        };

        const res = yield* search(n, g + 1);
        
        if (res.found) return { found: true, cost: res.cost };
        if (res.cost < min) min = res.cost;
        
        pathStack.pop(); // Backtrack
      }
      
      return { found: false, cost: min };
    }

    // Run search for current bound
    // We clear visitedKeys if we want to show 'restart', but keeping them shows total effort better.
    // Let's keep them to show "history of exploration" vs "current path".
    // Actually, IDA* "re-visits" nodes. To make it look cool, we can let them stay visited.
    
    const iterator = search(start, 0);
    let result = iterator.next();
    
    while (!result.done) {
      yield result.value;
      result = iterator.next();
    }
    
    const { found, cost } = result.value as { found: boolean, cost: number };

    if (found) {
      yield {
        visited: Array.from(visitedKeys).map(fromKey),
        frontier: [],
        path: [...pathStack]
      };
      return;
    }

    if (cost === Infinity) return; // No path possible
    
    bound = cost; // Increase bound
    // Optionally yield a "reset" frame here to indicate next iteration
  }
}


// --- Main Factory ---

export function createAlgorithmGenerator(
  type: AlgorithmType,
  grid: CellData[][],
  start: Coordinate,
  end: Coordinate
): Generator<AnimationStep> {
  switch (type) {
    case AlgorithmType.BFS:
      return bfsGenerator(grid, start, end);
    case AlgorithmType.DFS:
      return dfsGenerator(grid, start, end);
    case AlgorithmType.DIJKSTRA:
      return weightedSearchGenerator(grid, start, end, { usePathCost: true, heuristicWeight: 0 });
    case AlgorithmType.ASTAR:
      return weightedSearchGenerator(grid, start, end, { usePathCost: true, heuristicWeight: 1 });
    case AlgorithmType.GREEDY:
      return weightedSearchGenerator(grid, start, end, { usePathCost: false, heuristicWeight: 1 });
    case AlgorithmType.BIDIRECTIONAL:
      return bidirectionalGenerator(grid, start, end);
    case AlgorithmType.IDA_STAR:
      return idaStarGenerator(grid, start, end);
    default:
      return bfsGenerator(grid, start, end);
  }
}
