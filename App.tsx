import React, { useState, useEffect, useCallback, useRef } from 'react';
import Maze3D from './components/Maze3D';
import Controls from './components/Controls';
import { generateMaze } from './services/mazeGenerator';
import { createAlgorithmGenerator } from './services/algorithms';
import { AlgorithmType, MazeState, AlgorithmStats, AnimationStep, Coordinate } from './types';
import { MAZE_SIZE, ANIMATION_SPEED_LEVELS } from './constants';

const App: React.FC = () => {
  // --- State ---
  const [maze, setMaze] = useState<MazeState | null>(null);
  const [algorithm, setAlgorithm] = useState<AlgorithmType>(AlgorithmType.BFS);
  const [speed, setSpeed] = useState<number>(ANIMATION_SPEED_LEVELS.FAST);
  
  // Camera Modes
  const [isAutoCamera, setIsAutoCamera] = useState<boolean>(false); // Drone follow during generation
  const [isWalking, setIsWalking] = useState<boolean>(false); // FPS walkthrough after completion
  const [finalPath, setFinalPath] = useState<Coordinate[]>([]); // Store ordered path for walkthrough

  // Animation/Vis State
  const [animationState, setAnimationState] = useState<{
    visited: Set<string>;
    frontier: Set<string>;
    path: Set<string>;
    currentHead: Coordinate | null;
  }>({
    visited: new Set(),
    frontier: new Set(),
    path: new Set(),
    currentHead: null,
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
      currentHead: null,
    });
    setFinalPath([]);
    setIsWalking(false);
    
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
      currentHead: null,
    });
    setFinalPath([]);
    setIsWalking(false);
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
    let lastValue: AnimationStep | null = null;

    const step = () => {
      if (!generatorRef.current) return;
      
      const { value, done } = generatorRef.current.next();
      
      if (value) {
        lastValue = value;
      }
      
      // Handle completion
      if (done) {
        if (lastValue && lastValue.path.length > 0) {
          // Filter adjacent duplicates to prevent degenerate segments that confuse lookAt
          const rawPath = lastValue.path;
          const cleanPath = rawPath.filter((node, i) => {
             if (i === 0) return true;
             const prev = rawPath[i-1];
             return !(node.x === prev.x && node.y === prev.y);
          });
          
          setFinalPath(cleanPath);
          
          // Ensure visual state is final
          setAnimationState({
             visited: new Set(lastValue.visited.map(c => `${c.x},${c.y}`)),
             frontier: new Set(),
             path: new Set(lastValue.path.map(c => `${c.x},${c.y}`)),
             currentHead: null,
          });

          setStats(prev => ({ 
            ...prev, 
            status: 'COMPLETED',
            visitedCount: lastValue!.visited.length,
            pathLength: lastValue!.path.length
          }));
        } else {
          setStats(prev => ({ ...prev, status: 'NO_PATH' }));
        }
        return;
      }

      if (!value) return;

      // Update Visualization State from Generator Output
      setAnimationState({
        visited: new Set(value.visited.map(c => `${c.x},${c.y}`)),
        frontier: new Set(value.frontier.map(c => `${c.x},${c.y}`)),
        path: new Set(value.path.map(c => `${c.x},${c.y}`)),
        currentHead: value.current || null,
      });

      setStats(prev => ({
        ...prev,
        visitedCount: value.visited.length,
        pathLength: value.path.length,
      }));

      // Schedule next step
      if (speed === 0) {
        timerRef.current = window.setTimeout(step, 0); 
      } else {
        timerRef.current = window.setTimeout(step, speed);
      }
    };

    // Start loop
    step();

  }, [maze, algorithm, speed, handleReset]);

  // Walkthrough Handlers
  const handleStartWalk = useCallback(() => setIsWalking(true), []);
  const handleStopWalk = useCallback(() => setIsWalking(false), []);

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
        isAutoCamera={isAutoCamera}
        isWalking={isWalking}
        finalPath={finalPath}
        onWalkComplete={handleStopWalk}
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
        isAutoCamera={isAutoCamera}
        setIsAutoCamera={setIsAutoCamera}
        onStartWalk={handleStartWalk}
        isWalking={isWalking}
      />

      <div className="absolute bottom-4 right-4 text-gray-600 text-xs select-none pointer-events-none">
        <p>Left Click: Rotate | Right Click: Pan | Scroll: Zoom</p>
      </div>
    </div>
  );
};

export default App;