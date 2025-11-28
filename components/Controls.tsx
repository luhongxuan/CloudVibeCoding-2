import React from 'react';
import { AlgorithmType, AlgorithmStats } from '../types';
import { ANIMATION_SPEED_LEVELS, ALGORITHM_INFO } from '../constants';

interface ControlsProps {
  currentAlgorithm: AlgorithmType;
  setAlgorithm: (algo: AlgorithmType) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  onGenerate: () => void;
  onRun: () => void;
  onReset: () => void;
  stats: AlgorithmStats;
  isAutoCamera: boolean;
  setIsAutoCamera: (val: boolean) => void;
  onStartWalk: () => void;
  isWalking: boolean;
}

const Controls: React.FC<ControlsProps> = ({
  currentAlgorithm,
  setAlgorithm,
  speed,
  setSpeed,
  onGenerate,
  onRun,
  onReset,
  stats,
  isAutoCamera,
  setIsAutoCamera,
  onStartWalk,
  isWalking
}) => {
  return (
    <div className="absolute top-4 left-4 z-10 w-80 flex flex-col gap-4">
      {/* Main Control Panel */}
      <div className="bg-black/80 backdrop-blur-md border border-gray-800 p-6 rounded-xl shadow-2xl text-white">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-4">
          NeonPath 3D
        </h1>

        {/* Algorithm Select */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Algorithm
          </label>
          <select 
            value={currentAlgorithm}
            onChange={(e) => setAlgorithm(e.target.value as AlgorithmType)}
            disabled={stats.status === 'RUNNING'}
            className="w-full bg-gray-900 border border-gray-700 text-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
          >
            {Object.values(AlgorithmType).map((algo) => (
              <option key={algo} value={algo}>{algo}</option>
            ))}
          </select>
        </div>

        {/* Speed Controls */}
        <div className="mb-6">
           <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Speed
          </label>
          <div className="flex gap-2 bg-gray-900 p-1 rounded-lg">
            {Object.entries(ANIMATION_SPEED_LEVELS).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setSpeed(val)}
                className={`flex-1 py-1 px-2 rounded-md text-xs font-bold transition-all ${
                  speed === val 
                  ? 'bg-cyan-600 text-white shadow-lg' 
                  : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {key === 'NORMAL' ? '1x' : key === 'FAST' ? '2x' : key === 'SLOW' ? '0.5x' : 'MAX'}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={onGenerate}
            disabled={stats.status === 'RUNNING' || isWalking}
            className="col-span-2 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg font-semibold transition-colors border border-gray-600"
          >
            <i className="fas fa-random mr-2"></i> New Maze
          </button>
          
          <button
            onClick={onRun}
            disabled={stats.status === 'RUNNING' || stats.status === 'COMPLETED' || isWalking}
            className={`py-3 rounded-lg font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center ${
              stats.status === 'RUNNING' ? 'bg-gray-600 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500'
            }`}
          >
             <i className="fas fa-play mr-2"></i> Start
          </button>

          <button
            onClick={onReset}
            disabled={stats.status === 'RUNNING' || isWalking}
             className="py-3 rounded-lg font-bold bg-gray-800 hover:bg-red-900/50 text-gray-300 border border-gray-700 transition-colors"
          >
            <i className="fas fa-undo"></i>
          </button>

          {/* Camera Toggles */}
          <div className="col-span-2 grid grid-cols-2 gap-3 mt-2">
            {/* Generation Auto-Follow Toggle */}
            <button
                onClick={() => setIsAutoCamera(!isAutoCamera)}
                disabled={isWalking}
                className={`py-2 rounded-lg font-semibold transition-colors border flex items-center justify-center text-xs ${
                    isAutoCamera ? 'bg-indigo-900/50 border-indigo-500 text-indigo-300' : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-white'
                }`}
            >
                {isAutoCamera ? 'Drone: ON' : 'Drone: OFF'}
            </button>

            {/* Path Walkthrough Button */}
            <button
                onClick={onStartWalk}
                disabled={stats.status !== 'COMPLETED' || isWalking}
                className={`py-2 rounded-lg font-bold transition-colors border flex items-center justify-center text-xs shadow-lg ${
                    isWalking 
                        ? 'bg-green-600/20 border-green-500 text-green-400 animate-pulse' 
                        : stats.status === 'COMPLETED'
                            ? 'bg-green-700 hover:bg-green-600 text-white border-green-600 cursor-pointer'
                            : 'bg-gray-800 border-gray-600 text-gray-500 cursor-not-allowed'
                }`}
            >
                <i className="fas fa-walking mr-2"></i> Walk
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="border-t border-gray-800 pt-4">
           <div className="flex justify-between items-center mb-1">
             <span className="text-gray-400 text-sm">Status:</span>
             <span className={`text-sm font-bold ${
               stats.status === 'COMPLETED' ? 'text-green-400' : 
               stats.status === 'RUNNING' ? 'text-yellow-400' : 'text-gray-200'
             }`}>{stats.status}</span>
           </div>
           <div className="flex justify-between items-center mb-1">
             <span className="text-gray-400 text-sm">Visited:</span>
             <span className="text-sm font-mono text-white">{stats.visitedCount}</span>
           </div>
           <div className="flex justify-between items-center">
             <span className="text-gray-400 text-sm">Path Length:</span>
             <span className="text-sm font-mono text-cyan-400">{stats.pathLength}</span>
           </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className="bg-black/80 backdrop-blur-md border border-gray-800 p-5 rounded-xl shadow-xl text-white">
        <h3 className="text-lg font-bold text-cyan-400 mb-2 border-b border-gray-700 pb-2">
          {ALGORITHM_INFO[currentAlgorithm].title}
        </h3>
        <p className="text-xs text-gray-300 mb-3 leading-relaxed">
          {ALGORITHM_INFO[currentAlgorithm].desc}
        </p>
        <div className="text-xs space-y-1">
          <div className="flex">
             <span className="text-gray-500 w-20 flex-shrink-0">Complexity:</span>
             <span className="text-gray-300">{ALGORITHM_INFO[currentAlgorithm].complexity}</span>
          </div>
          <div className="flex">
             <span className="text-gray-500 w-20 flex-shrink-0">Properties:</span>
             <span className="text-gray-300">{ALGORITHM_INFO[currentAlgorithm].properties}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;