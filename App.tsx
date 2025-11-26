import React, { useState, useEffect, useCallback, useRef } from 'react';
import Maze3D from './components/Maze3D';
import Controls from './components/Controls';
import { generateMaze } from './services/mazeGenerator';
import { createAlgorithmGenerator } from './services/algorithms';
import { AlgorithmType, MazeState, AlgorithmStats, AnimationStep } from './types';
import { MAZE_SIZE, ANIMATION_SPEED_LEVELS } from './constants';

const App: React.FC = () => {
  // --- State ---
  const [maze, setMaze] = useState<MazeState | null>(null);
  const [algorithm, setAlgorithm] = useState<AlgorithmType>(AlgorithmType.BFS);
  const [speed, setSpeed] = useState<number>(ANIMATION_SPEED_LEVELS.FAST);
  
  // Animation/Vis State
  const [animationState, setAnimationState] = useState<{
    visited: Set<string>;
    frontier: Set<string>;
    path: Set<string>;
  }>({
    visited: new Set(),
    frontier: new Set(),
    path: new Set(),
  });

  const [stats, setStats] = useState<AlgorithmStats>({
    visitedCount: 0,
    pathLength: 0,
    executionTime: 0,
    status: 'IDLE',
  });

  // Refs for loop management
  const generatorRef = useRef<Generator<AnimationStep> | null>(null);
  const timerRef = useRef<number | null>(null);

  // --- Actions ---

  const handleGenerateMaze = useCallback(() => {
    // Reset running animation
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const newMaze = generateMaze(MAZE_SIZE, MAZE_SIZE);
    setMaze(newMaze);
    
    // Reset visualization state
    setAnimationState({
      visited: new Set(),
      frontier: new Set(),
      path: new Set(),
    });
    
    setStats({
      visitedCount: 0,
      pathLength: 0,
      executionTime: 0,
      status: 'IDLE',
    });

    generatorRef.current = null;
  }, []);

  const handleReset = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setAnimationState({
      visited: new Set(),
      frontier: new Set(),
      path: new Set(),
    });
    setStats(prev => ({ ...prev, visitedCount: 0, pathLength: 0, status: 'IDLE' }));
    generatorRef.current = null;
  }, []);

  const handleRun = useCallback(() => {
    if (!maze) return;
    
    // Clear previous run if any
    handleReset();

    setStats(prev => ({ ...prev, status: 'RUNNING' }));
    
    // Initialize generator
    generatorRef.current = createAlgorithmGenerator(algorithm, maze.grid, maze.start, maze.end);

    const step = () => {
      if (!generatorRef.current) return;
      
      const startTime = performance.now();
      const { value, done } = generatorRef.current.next();
      
      if (done || !value) {
        setStats(prev => ({ ...prev, status: value?.path.length ? 'COMPLETED' : 'NO_PATH' }));
        return;
      }

      // Update Visualization State from Generator Output
      // Optimization: For "Instant" speed, we might want to loop inside here multiple times, 
      // but for simplicity, we just use 0ms timeout which is still bound by React render cycle.
      
      setAnimationState({
        visited: new Set(value.visited.map(c => `${c.x},${c.y}`)),
        frontier: new Set(value.frontier.map(c => `${c.x},${c.y}`)),
        path: new Set(value.path.map(c => `${c.x},${c.y}`)),
      });

      setStats(prev => ({
        ...prev,
        visitedCount: value.visited.length,
        pathLength: value.path.length,
      }));

      // Schedule next step
      if (speed === 0) {
        // If instant, run loop faster or use minimal timeout
        timerRef.current = window.setTimeout(step, 0); 
      } else {
        timerRef.current = window.setTimeout(step, speed);
      }
    };

    // Start loop
    step();

  }, [maze, algorithm, speed, handleReset]);

  // Initial load
  useEffect(() => {
    handleGenerateMaze();
  }, [handleGenerateMaze]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  if (!maze) return <div className="text-white flex items-center justify-center h-screen">Loading Maze...</div>;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <Maze3D 
        maze={maze} 
        animationState={animationState}
      />
      
      <Controls 
        currentAlgorithm={algorithm}
        setAlgorithm={setAlgorithm}
        speed={speed}
        setSpeed={setSpeed}
        onGenerate={handleGenerateMaze}
        onRun={handleRun}
        onReset={handleReset}
        stats={stats}
      />

      <div className="absolute bottom-4 right-4 text-gray-600 text-xs select-none">
        <p>Left Click: Rotate | Right Click: Pan | Scroll: Zoom</p>
      </div>
    </div>
  );
};

export default App;