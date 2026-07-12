import React, { useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';

interface MobileControlsProps {
  onRespawnClick: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ onRespawnClick }) => {
  
  // Initialize window object for mobile controls
  useEffect(() => {
    (window as any).mobileControls = {
      left: false,
      right: false,
      jump: false
    };

    return () => {
      delete (window as any).mobileControls;
    };
  }, []);

  const setControl = (key: 'left' | 'right' | 'jump', value: boolean) => {
    if ((window as any).mobileControls) {
      (window as any).mobileControls[key] = value;
    }
  };

  return (
    <div className="absolute inset-0 z-30 pointer-events-none select-none flex items-end justify-between p-6 pb-8 md:hidden">
      
      {/* Left Pad: Directional Buttons */}
      <div className="flex gap-4 pointer-events-auto">
        {/* Left Arrow Button */}
        <button
          onTouchStart={() => setControl('left', true)}
          onTouchEnd={() => setControl('left', false)}
          onMouseDown={() => setControl('left', true)}
          onMouseUp={() => setControl('left', false)}
          onMouseLeave={() => setControl('left', false)}
          className="w-16 h-16 flex items-center justify-center bg-slate-900/40 border border-slate-700/30 backdrop-blur-sm text-slate-300 rounded-2xl active:bg-slate-700/60 active:scale-95 active:text-white transition-all select-none touch-none"
        >
          <ArrowLeft size={32} />
        </button>

        {/* Right Arrow Button */}
        <button
          onTouchStart={() => setControl('right', true)}
          onTouchEnd={() => setControl('right', false)}
          onMouseDown={() => setControl('right', true)}
          onMouseUp={() => setControl('right', false)}
          onMouseLeave={() => setControl('right', false)}
          className="w-16 h-16 flex items-center justify-center bg-slate-900/40 border border-slate-700/30 backdrop-blur-sm text-slate-300 rounded-2xl active:bg-slate-700/60 active:scale-95 active:text-white transition-all select-none touch-none"
        >
          <ArrowRight size={32} />
        </button>
      </div>

      {/* Right Pad: Jump & Respawn */}
      <div className="flex flex-col items-center gap-4 pointer-events-auto">
        
        {/* Respawn Button (above jump) */}
        <button
          onTouchStart={onRespawnClick}
          onClick={onRespawnClick}
          className="px-4 py-2 flex items-center gap-1 bg-red-950/40 border border-red-700/30 backdrop-blur-sm text-red-300 rounded-xl active:bg-red-900/60 active:scale-95 active:text-white transition-all select-none touch-none text-xs font-bold font-sans uppercase tracking-wider"
        >
          <RotateCcw size={14} />
          Respawn
        </button>

        {/* Jump Button (large space) */}
        <button
          onTouchStart={() => setControl('jump', true)}
          onTouchEnd={() => setControl('jump', false)}
          onMouseDown={() => setControl('jump', true)}
          onMouseUp={() => setControl('jump', false)}
          onMouseLeave={() => setControl('jump', false)}
          className="w-20 h-20 flex flex-col items-center justify-center bg-indigo-950/45 border border-indigo-700/30 backdrop-blur-md text-indigo-200 rounded-full active:bg-indigo-600/80 active:scale-95 active:text-white transition-all select-none touch-none shadow-lg shadow-indigo-900/10"
        >
          <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Jump</span>
          <span className="text-xs font-bold leading-3">Space</span>
        </button>
        
      </div>
      
    </div>
  );
};
