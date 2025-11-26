import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { CellData, CellType, MazeState } from '../types';
import { COLORS, WALL_HEIGHT } from '../constants';

// Add type declarations for Three.js elements in JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      boxGeometry: any;
      meshStandardMaterial: any;
      group: any;
      planeGeometry: any;
      ambientLight: any;
      pointLight: any;
      color: any;
    }
  }
}

// Augment React's internal JSX namespace to ensure compatibility with all TS configurations
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      boxGeometry: any;
      meshStandardMaterial: any;
      group: any;
      planeGeometry: any;
      ambientLight: any;
      pointLight: any;
      color: any;
    }
  }
}

interface Maze3DProps {
  maze: MazeState;
  animationState: {
    visited: Set<string>;
    frontier: Set<string>;
    path: Set<string>;
  };
}

const CellMesh = ({ cell, state, totalWidth, totalHeight }: { cell: CellData, state: 'wall' | 'visited' | 'frontier' | 'path' | 'empty' | 'start' | 'end', totalWidth: number, totalHeight: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Calculate position: center the maze
  const x = cell.x - totalWidth / 2 + 0.5;
  const z = cell.y - totalHeight / 2 + 0.5;
  
  const isWall = state === 'wall';
  const y = isWall ? WALL_HEIGHT / 2 : 0;
  const height = isWall ? WALL_HEIGHT : 0.1;

  let color = COLORS.FLOOR;
  let emissive = new THREE.Color(0,0,0);
  let emissiveIntensity = 0;

  // Use lower intensities to avoid blowout/white-out
  switch (state) {
    case 'wall':
      color = COLORS.WALL;
      emissive = new THREE.Color(COLORS.WALL_EMISSIVE);
      emissiveIntensity = 0.8; 
      break;
    case 'start':
      color = COLORS.START;
      emissive = new THREE.Color(COLORS.START);
      emissiveIntensity = 0.8;
      break;
    case 'end':
      color = COLORS.END;
      emissive = new THREE.Color(COLORS.END);
      emissiveIntensity = 0.8;
      break;
    case 'path':
      color = COLORS.PATH;
      emissive = new THREE.Color(COLORS.PATH);
      emissiveIntensity = 1.5; // Brightest element, but controlled
      break;
    case 'visited':
      color = COLORS.VISITED;
      emissive = new THREE.Color(COLORS.VISITED);
      emissiveIntensity = 0.3; // Very subtle for visited history
      break;
    case 'frontier':
      color = COLORS.FRONTIER;
      emissive = new THREE.Color(COLORS.FRONTIER);
      emissiveIntensity = 0.6;
      break;
    default:
      color = "#050505"; 
  }

  // Animation for state changes
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Gentle pulse for path
      if (state === 'path') {
        // meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 5) * 0.1;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={[x, y, z]}>
      <boxGeometry args={[1, height, 1]} />
      <meshStandardMaterial 
        color={color} 
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={0.4}
        metalness={0.6}
      />
    </mesh>
  );
};

// Floor Plane
const Floor = ({ width, height }: { width: number, height: number }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
    <planeGeometry args={[width + 4, height + 4]} />
    <meshStandardMaterial color="#000000" roughness={0.1} metalness={0.1} />
  </mesh>
);

const SceneContent = ({ maze, animationState }: Maze3DProps) => {
  const { grid, width, height } = maze;

  return (
    <group>
      <Floor width={width} height={height} />
      {grid.map((row) =>
        row.map((cell) => {
          const key = `${cell.x},${cell.y}`;
          let state: 'wall' | 'visited' | 'frontier' | 'path' | 'empty' | 'start' | 'end' = 'empty';

          if (cell.type === CellType.WALL) state = 'wall';
          else if (cell.type === CellType.START) state = 'start';
          else if (cell.type === CellType.END) state = 'end';
          else if (animationState.path.has(key)) state = 'path';
          else if (animationState.frontier.has(key)) state = 'frontier';
          else if (animationState.visited.has(key)) state = 'visited';

          return (
            <CellMesh 
              key={key} 
              cell={cell} 
              state={state} 
              totalWidth={width} 
              totalHeight={height} 
            />
          );
        })
      )}
    </group>
  );
};

const Maze3D: React.FC<Maze3DProps> = (props) => {
  return (
    <div className="w-full h-full">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 25, 15]} fov={50} />
        <OrbitControls 
          enablePan={true} 
          enableZoom={true} 
          enableRotate={true}
          maxPolarAngle={Math.PI / 2.1} // Prevent going below floor
        />
        
        {/* Very dark background */}
        <color attach="background" args={['#010101']} />
        
        {/* Dim ambient light for mood */}
        <ambientLight intensity={0.1} />
        
        {/* Dimmer point lights */}
        <pointLight position={[10, 10, 10]} intensity={0.4} />
        <pointLight position={[-10, 10, -10]} intensity={0.2} />
        
        <SceneContent {...props} />
        
        <EffectComposer disableNormalPass>
           <Bloom 
             luminanceThreshold={0.15} // Bloom slightly easier, but intensity is lower
             mipmapBlur 
             intensity={0.6} // Soft, subtle glow
             radius={0.7}
           />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default Maze3D;