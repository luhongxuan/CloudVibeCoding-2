import { CellData, CellType, Coordinate, MazeState } from "../types";

const DIRECTIONS = [
  { x: 0, y: -2 }, // Up
  { x: 0, y: 2 },  // Down
  { x: -2, y: 0 }, // Left
  { x: 2, y: 0 },  // Right
];

export const createEmptyGrid = (width: number, height: number): CellData[][] => {
  const grid: CellData[][] = [];
  for (let y = 0; y < height; y++) {
    const row: CellData[] = [];
    for (let x = 0; x < width; x++) {
      row.push({
        x,
        y,
        type: CellType.WALL,
        isVisited: false,
        isFrontier: false,
        isPath: false,
        distance: Infinity,
        parent: null,
      });
    }
    grid.push(row);
  }
  return grid;
};

// Shuffle array for randomization
const shuffle = <T>(array: T[]): T[] => {
  return array.sort(() => Math.random() - 0.5);
};

export const generateMaze = (width: number, height: number): MazeState => {
  // Ensure odd dimensions for walls/passages to work correctly
  const w = width % 2 === 0 ? width + 1 : width;
  const h = height % 2 === 0 ? height + 1 : height;

  const grid = createEmptyGrid(w, h);
  const start: Coordinate = { x: 1, y: 1 };
  
  // Recursive Backtracking
  const stack: Coordinate[] = [start];
  grid[start.y][start.x].type = CellType.EMPTY;

  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors: { x: number; y: number; direction: { x: number; y: number } }[] = [];

    // Check neighbors 2 steps away
    for (const dir of DIRECTIONS) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;

      if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1) {
        if (!visited.has(`${nx},${ny}`)) {
          neighbors.push({ x: nx, y: ny, direction: dir });
        }
      }
    }

    if (neighbors.length > 0) {
      // Choose random neighbor
      const { x, y, direction } = shuffle(neighbors)[0];
      
      // Carve wall between current and neighbor
      const wallX = current.x + (direction.x / 2);
      const wallY = current.y + (direction.y / 2);
      
      grid[wallY][wallX].type = CellType.EMPTY;
      grid[y][x].type = CellType.EMPTY;

      visited.add(`${x},${y}`);
      stack.push({ x, y });
    } else {
      stack.pop();
    }
  }

  // Set Start and End
  grid[start.y][start.x].type = CellType.START;
  const end: Coordinate = { x: w - 2, y: h - 2 };
  grid[end.y][end.x].type = CellType.END;

  return {
    grid,
    width: w,
    height: h,
    start,
    end,
  };
};