import { AlgorithmType } from "./types";

export const MAZE_SIZE = 21; // Must be odd for Recursive Backtracking
export const WALL_HEIGHT = 1.2;
export const ANIMATION_SPEED_LEVELS = {
  SLOW: 150,
  NORMAL: 50,
  FAST: 10,
  INSTANT: 0,
};

export const COLORS = {
  WALL: "#020c0c", // Very deep dark teal/black
  WALL_EMISSIVE: "#578e8e", // Deep dark teal glow (low intensity)
  FLOOR: "#000000", // Pure black
  START: "#006400", // Dark Green
  END: "#640000", // Dark Red
  VISITED: "#c8e14c", // Deep Violet/Indigo (almost black/purple)
  FRONTIER: "#003366", // Dark Blue
  PATH: "#b36b00", // Darkened Amber/Gold
};

export const ALGORITHM_INFO: Record<AlgorithmType, { title: string; desc: string; complexity: string; properties: string }> = {
  [AlgorithmType.BFS]: {
    title: "Breadth-First Search (BFS)",
    desc: "Explores the maze layer by layer, radiating outward from the start node like a ripple in water. It guarantees the shortest path in an unweighted grid.",
    complexity: "Time: O(V + E) | Space: O(V)",
    properties: "Complete: Yes | Optimal: Yes (unweighted)",
  },
  [AlgorithmType.DFS]: {
    title: "Depth-First Search (DFS)",
    desc: "Explores as far as possible along each branch before backtracking. It tends to create long, winding paths and does not guarantee the shortest route.",
    complexity: "Time: O(V + E) | Space: O(V)",
    properties: "Complete: Yes (finite) | Optimal: No",
  },
  [AlgorithmType.DIJKSTRA]: {
    title: "Dijkstra's Algorithm",
    desc: "Prioritizes paths with the lowest accumulated cost. In a uniform grid, it behaves like BFS, but allows for weighted edges.",
    complexity: "Time: O((V+E) log V) | Space: O(V)",
    properties: "Complete: Yes | Optimal: Yes",
  },
  [AlgorithmType.ASTAR]: {
    title: "A* Search",
    desc: "Uses a heuristic (Manhattan distance) to estimate cost to goal, guiding the search intelligently towards the target.",
    complexity: "Time: O(E) (heuristic dependent) | Space: O(V)",
    properties: "Complete: Yes | Optimal: Yes",
  },
  [AlgorithmType.GREEDY]: {
    title: "Greedy Best-First Search",
    desc: "Selects the path that appears closest to the goal based solely on the heuristic. It is very fast but often yields non-optimal paths.",
    complexity: "Time: O(V) (worst case) | Space: O(V)",
    properties: "Complete: Yes (finite) | Optimal: No",
  },
  [AlgorithmType.BIDIRECTIONAL]: {
    title: "Bidirectional BFS",
    desc: "Runs two simultaneous BFS searches: one from the start and one from the end. They meet in the middle, often significantly reducing the search space.",
    complexity: "Time: O(b^(d/2)) | Space: O(b^(d/2))",
    properties: "Complete: Yes | Optimal: Yes (unweighted)",
  },
  [AlgorithmType.IDA_STAR]: {
    title: "IDA* (Iterative Deepening A*)",
    desc: "Runs a series of depth-first searches with increasing cost thresholds. It combines the space efficiency of DFS with the optimality of A*.",
    complexity: "Time: Depends on heuristic | Space: O(d)",
    properties: "Complete: Yes | Optimal: Yes",
  },
};