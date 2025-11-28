import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { CellData, CellType, MazeState, Coordinate } from '../types';
import { COLORS, WALL_HEIGHT } from '../constants';

interface Maze3DProps {
  maze: MazeState;
  animationState: {
    visited: Set<string>;
    frontier: Set<string>;
    path: Set<string>;
    currentHead: Coordinate | null;
  };
  isAutoCamera: boolean;
  isWalking: boolean;
  finalPath: Coordinate[];
  onWalkComplete: () => void;
}

interface CellMeshProps {
  cell: CellData;
  state: 'wall' | 'visited' | 'frontier' | 'path' | 'empty' | 'start' | 'end';
  totalWidth: number;
  totalHeight: number;
}

const CellMesh: React.FC<CellMeshProps> = ({ cell, state, totalWidth, totalHeight }) => {
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
      emissiveIntensity = 1.5;
      break;
    case 'visited':
      color = COLORS.VISITED;
      emissive = new THREE.Color(COLORS.VISITED);
      emissiveIntensity = 0.3;
      break;
    case 'frontier':
      color = COLORS.FRONTIER;
      emissive = new THREE.Color(COLORS.FRONTIER);
      emissiveIntensity = 0.6;
      break;
    default:
      color = "#050505"; 
  }

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

const Floor = ({ width, height }: { width: number, height: number }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
    <planeGeometry args={[width + 4, height + 4]} />
    <meshStandardMaterial color="#000000" roughness={0.1} metalness={0.1} />
  </mesh>
);

// --- Camera Rigs ---

// 1. Generation Drone Follow
const CameraRig = ({ 
  target, 
  enabled, 
  width, 
  height 
}: { 
  target: Coordinate | null, 
  enabled: boolean, 
  width: number, 
  height: number 
}) => {
  const { camera } = useThree();
  
  useFrame((state, delta) => {
    if (enabled && target) {
      const tx = target.x - width / 2 + 0.5;
      const tz = target.y - height / 2 + 0.5;
      const targetPos = new THREE.Vector3(tx, 2.0, tz + 2.0); // High angle
      state.camera.position.lerp(targetPos, 4 * delta);
      state.camera.lookAt(new THREE.Vector3(tx, 0, tz));
    }
  });

  return null;
};

// 2. First Person Path Walkthrough
const WalkthroughRig = ({ 
  path, 
  enabled, 
  onComplete, 
  width, 
  height 
}: { 
  path: Coordinate[], 
  enabled: boolean, 
  onComplete: () => void, 
  width: number, 
  height: number 
}) => {
  const { camera } = useThree();
  const currentIndexRef = useRef(0);
  const alphaRef = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []); // Helper object for calculating target rotation
  const WALK_SPEED = 2.5; // Cells per second
  const ROTATION_SPEED = 10.0; // Slerp factor (increased for snappier turns)

  // Helper to get world pos
  const getWorldPos = (idx: number) => {
    const c = path[idx];
    // y = 0.5 for eye level (halfway up a 1 unit cube, although walls are 1.2)
    return new THREE.Vector3(c.x - width / 2 + 0.5, 0.5, c.y - height / 2 + 0.5);
  };

  useEffect(() => {
    if (enabled && path.length > 0) {
      currentIndexRef.current = 0;
      alphaRef.current = 0;
      
      const startPos = getWorldPos(0);
      camera.position.copy(startPos);
      
      // Force Up vector to be Y-axis
      camera.up.set(0, 1, 0);

      if (path.length > 1) {
        // Instantly face the first direction so we don't swing wildly at start
        const nextPos = getWorldPos(1);
        dummy.position.copy(startPos);
        dummy.up.set(0, 1, 0);
        dummy.lookAt(nextPos);
        // Correct potential 180 degree flip if camera faces backwards
        dummy.rotateY(Math.PI); 
        camera.quaternion.copy(dummy.quaternion);
      }
    }
  }, [enabled, path, camera, width, height, dummy]);

  useFrame((state, delta) => {
    if (!enabled || path.length < 2) return;

    const i = currentIndexRef.current;
    
    // Check if finished
    if (i >= path.length - 1) {
      onComplete();
      return;
    }

    // Advance progress
    alphaRef.current += delta * WALK_SPEED;

    // Handle waypoint crossing
    if (alphaRef.current >= 1.0) {
      alphaRef.current -= 1.0;
      currentIndexRef.current += 1;
      
      // Check again if we just finished
      if (currentIndexRef.current >= path.length - 1) {
        onComplete();
        return;
      }
    }

    // Interpolate Position
    const p1 = getWorldPos(currentIndexRef.current);
    const p2 = getWorldPos(currentIndexRef.current + 1);
    
    // Linear Interpolation for position
    const currentPos = new THREE.Vector3().copy(p1).lerp(p2, alphaRef.current);
    state.camera.position.copy(currentPos);

    // Smooth Rotation (Slerp)
    // IMPORTANT: Anchor dummy to p1 (start of segment) rather than currentPos.
    dummy.position.copy(p1);
    dummy.up.set(0, 1, 0); // Enforce up vector
    dummy.lookAt(p2);
    
    // Fix: Flip 180 degrees to correct "walking backwards" issue
    dummy.rotateY(Math.PI);

    // Slerp camera quaternion towards dummy quaternion
    state.camera.quaternion.slerp(dummy.quaternion, delta * ROTATION_SPEED);
  });

  return null;
};

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
  const { maze, isAutoCamera, isWalking, animationState, finalPath, onWalkComplete } = props;

  return (
    <div className="w-full h-full">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 25, 15]} fov={50} />
        
        {/* Active Walkthrough overrides everything */}
        <WalkthroughRig 
          enabled={isWalking}
          path={finalPath}
          onComplete={onWalkComplete}
          width={maze.width}
          height={maze.height}
        />

        {/* Generation Drone follows head if not walking */}
        <CameraRig 
          target={animationState.currentHead} 
          enabled={isAutoCamera && !isWalking} 
          width={maze.width} 
          height={maze.height} 
        />

        {/* Manual controls only when no auto-movement is active */}
        <OrbitControls 
          enabled={!isWalking && !isAutoCamera}
          enablePan={true} 
          enableZoom={true} 
          enableRotate={true}
          maxPolarAngle={Math.PI / 2.1} 
        />
        
        <color attach="background" args={['#010101']} />
        
        <ambientLight intensity={0.1} />
        
        <pointLight position={[10, 10, 10]} intensity={0.4} />
        <pointLight position={[-10, 10, -10]} intensity={0.2} />
        
        <SceneContent {...props} />
        
        <EffectComposer enableNormalPass={false}>
           <Bloom 
             luminanceThreshold={0.15} 
             mipmapBlur 
             intensity={0.6} 
             radius={0.7}
           />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default Maze3D;