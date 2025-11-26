export enum AlgorithmType {
  BFS = 'BFS',
  DFS = 'DFS',
  DIJKSTRA = 'DIJKSTRA',
  ASTAR = 'ASTAR',
  GREEDY = 'GREEDY',
  BIDIRECTIONAL = 'BIDIRECTIONAL',
  IDA_STAR = 'IDA_STAR',
}

export enum CellType {
  WALL = 0,
  EMPTY = 1,
  START = 2,
  END = 3,
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface CellData {
  x: number;
  y: number;
  type: CellType;
  isVisited: boolean;
  isFrontier: boolean;
  isPath: boolean;
  distance: number; // For Dijkstra/A*
  parent: Coordinate | null;
}

export interface MazeState {
  grid: CellData[][];
  width: number;
  height: number;
  start: Coordinate;
  end: Coordinate;
}

export interface AlgorithmStats {
  visitedCount: number;
  pathLength: number;
  executionTime: number; // in ms
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'NO_PATH';
}

export type AnimationStep = {
  visited: Coordinate[];
  frontier: Coordinate[];
  path: Coordinate[];
  current?: Coordinate;
};