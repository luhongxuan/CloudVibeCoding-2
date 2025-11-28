import { GoogleGenAI, Type } from "@google/genai";
import { CellData, CellType, Coordinate, MazeState } from "../types";

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MAZE_DIMENSION = 21;

// --- Helper Functions for Auto-Repair ---

// Simple BFS to check if path exists from Start to End
const checkSolvability = (grid: number[][], start: Coordinate, end: Coordinate): boolean => {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = new Set<string>();
  const queue: Coordinate[] = [start];
  visited.add(`${start.x},${start.y}`);

  // If start or end are walls, it's unsolvable (unless we treat them as special, but typically they should be open)
  if (grid[start.y][start.x] === 0 || grid[end.y][end.x] === 0) return false;

  const dirs = [{x:0, y:1}, {x:0, y:-1}, {x:1, y:0}, {x:-1, y:0}];

  while(queue.length > 0) {
    const {x, y} = queue.shift()!;
    if (x === end.x && y === end.y) return true;

    for (const d of dirs) {
      const nx = x + d.x;
      const ny = y + d.y;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
        // 1 is Path, 0 is Wall
        if (grid[ny][nx] === 1 && !visited.has(`${nx},${ny}`)) {
          visited.add(`${nx},${ny}`);
          queue.push({x: nx, y: ny});
        }
      }
    }
  }
  return false;
};

// Dijkstra's algorithm to find a path, treating walls as high-cost edges (Soft Obstacles)
// This finds the path that requires breaking the fewest walls.
const repairMaze = (grid: number[][], start: Coordinate, end: Coordinate): number[][] => {
  const rows = grid.length;
  const cols = grid[0].length;
  
  // Clone grid to modify it safely
  const newGrid = grid.map(row => [...row]);

  const dist = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  const parent = new Map<string, string>();
  // Priority queue simulated with array sort (performance ok for 21x21)
  const pq: { x: number; y: number; cost: number }[] = [];

  dist[start.y][start.x] = 0;
  pq.push({ x: start.x, y: start.y, cost: 0 });

  const dirs = [{x:0, y:1}, {x:0, y:-1}, {x:1, y:0}, {x:-1, y:0}];

  while (pq.length > 0) {
    // Get node with lowest cost
    pq.sort((a, b) => a.cost - b.cost);
    const curr = pq.shift()!;

    if (curr.x === end.x && curr.y === end.y) break;

    const currentDist = dist[curr.y][curr.x];
    if (curr.cost > currentDist) continue;

    for (const d of dirs) {
      const nx = curr.x + d.x;
      const ny = curr.y + d.y;

      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
        // Cost: 1 if empty (1), 100 if wall (0)
        const isWall = newGrid[ny][nx] === 0;
        const weight = isWall ? 100 : 1;
        const newDist = currentDist + weight;

        if (newDist < dist[ny][nx]) {
          dist[ny][nx] = newDist;
          parent.set(`${nx},${ny}`, `${curr.x},${curr.y}`);
          pq.push({ x: nx, y: ny, cost: newDist });
        }
      }
    }
  }

  // Backtrack from end to start to carve the path
  let currKey = `${end.x},${end.y}`;
  const startKey = `${start.x},${start.y}`;
  
  while (parent.has(currKey)) {
    const [cx, cy] = currKey.split(',').map(Number);
    newGrid[cy][cx] = 1; // Force to Path
    currKey = parent.get(currKey)!;
  }
  // Ensure start is open
  newGrid[start.y][start.x] = 1;

  return newGrid;
};

export const generateMazeFromPrompt = async (userPrompt: string): Promise<MazeState> => {
  try {
    const modelId = "gemini-2.5-flash"; 

    const response = await ai.models.generateContent({
      model: modelId,
      contents: userPrompt,
      config: {
        systemInstruction: `You are a maze generator. 
        1. Generate a strictly 21x21 2D integer array representing a maze.
        2. Use 0 for WALL and 1 for PATH (Empty).
        3. The maze MUST be solvable. There must be a valid path from coordinate (1,1) to (19,19).
        4. The borders (x=0, y=0, x=20, y=20) should generally be walls (0), except for start/end areas if needed, but keeping them as walls is safer.
        5. The maze layout should visually reflect the user's prompt if it describes a shape (e.g., 'heart', 'smiley', 'letters').
        6. Return valid JSON only.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            grid: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
              },
            },
          },
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");

    const parsed = JSON.parse(jsonText);
    let rawGrid: number[][] = parsed.grid;

    // Validate dimensions
    if (!rawGrid || rawGrid.length !== MAZE_DIMENSION || rawGrid[0].length !== MAZE_DIMENSION) {
      throw new Error(`AI returned invalid grid dimensions. Expected ${MAZE_DIMENSION}x${MAZE_DIMENSION}`);
    }

    const start: Coordinate = { x: 1, y: 1 };
    const end: Coordinate = { x: MAZE_DIMENSION - 2, y: MAZE_DIMENSION - 2 };

    // 1. Force Start/End Open (Critical for Solvability Check)
    rawGrid[start.y][start.x] = 1;
    rawGrid[end.y][end.x] = 1;

    // 2. Check Solvability
    const isSolvable = checkSolvability(rawGrid, start, end);

    // 3. Repair if necessary
    if (!isSolvable) {
      console.warn("AI generated an unsolvable maze. Running auto-repair...");
      rawGrid = repairMaze(rawGrid, start, end);
    }

    // Convert raw 0/1 grid to MazeState structure
    const cells: CellData[][] = [];
    
    for (let y = 0; y < MAZE_DIMENSION; y++) {
      const row: CellData[] = [];
      for (let x = 0; x < MAZE_DIMENSION; x++) {
        const val = rawGrid[y][x];
        
        row.push({
          x,
          y,
          type: val === 1 ? CellType.EMPTY : CellType.WALL,
          isVisited: false,
          isFrontier: false,
          isPath: false,
          distance: Infinity,
          parent: null,
        });
      }
      cells.push(row);
    }

    // Explicitly mark Start and End types
    cells[start.y][start.x].type = CellType.START;
    cells[end.y][end.x].type = CellType.END;

    return {
      grid: cells,
      width: MAZE_DIMENSION,
      height: MAZE_DIMENSION,
      start,
      end,
    };

  } catch (error) {
    console.error("AI Maze Generation Failed:", error);
    throw error;
  }
};