import React from 'react';
import { RoomConfig, PlayerState } from '../types';
import { Play, Square, XOctagon, Eye, EyeOff, Radio, Users, Copy, Check } from 'lucide-react';

interface HostControlsProps {
  roomId: string;
  roomConfig: RoomConfig;
  players: Record<string, PlayerState>;
  spectatedPlayerId: string | null;
  onStartGame: () => void;
  onStopGame: () => void;
  onEndGame: () => void;
  onSpectatePlayer: (playerId: string | null) => void;
  copiedId: boolean;
  onCopyRoomId: () => void;
}

export const HostControls: React.FC<HostControlsProps> = ({
  roomId,
  roomConfig,
  players,
  spectatedPlayerId,
  onStartGame,
  onStopGame,
  onEndGame,
  onSpectatePlayer,
  copiedId,
  onCopyRoomId
}) => {
  const activePlayers = Object.values(players).filter(p => !p.isHost);

  return (
    <div className="absolute left-4 bottom-4 z-40 w-72 bg-slate-900/90 border border-slate-700/80 backdrop-blur-md p-4 rounded-xl shadow-2xl pointer-events-auto text-slate-100 flex flex-col gap-3">
      
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5 text-amber-500 font-bold text-sm uppercase">
          <Radio size={16} className="animate-pulse" />
          <span>Bảng Điều Khiển Host</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-400 font-bold rounded-full">
          Admin
        </span>
      </div>

      {/* Room ID Sharing */}
      <div className="flex items-center justify-between bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800/85">
        <div className="text-xs">
          <div className="text-slate-500 text-[10px] font-semibold uppercase">Mã phòng (Room ID)</div>
          <div className="font-mono font-bold text-slate-200">{roomId}</div>
        </div>
        <button
          onClick={onCopyRoomId}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-300 hover:text-white transition"
          title="Sao chép Mã phòng"
        >
          {copiedId ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
      </div>

      {/* Game Status Commands */}
      <div className="space-y-2">
        <span className="text-slate-500 text-[10px] font-semibold uppercase block">Trạng thái game</span>
        
        {roomConfig.status === 'waiting' && (
          <button
            onClick={onStartGame}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase rounded-lg shadow-md shadow-indigo-600/10 active:scale-95 transition"
          >
            <Play size={14} fill="white" />
            Bắt đầu game (Start)
          </button>
        )}

        {roomConfig.status === 'playing' && (
          <div className="flex gap-2">
            <button
              onClick={onStopGame}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs uppercase rounded-lg active:scale-95 transition"
            >
              <Square size={12} fill="currentColor" />
              Tạm dừng
            </button>
            <button
              onClick={onEndGame}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-650 hover:bg-red-500 text-white font-bold text-xs uppercase rounded-lg shadow-md shadow-red-650/10 active:scale-95 transition"
            >
              <XOctagon size={12} fill="white" />
              Kết thúc
            </button>
          </div>
        )}

        {roomConfig.status === 'paused' && (
          <div className="flex gap-2">
            <button
              onClick={onStartGame}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase rounded-lg shadow-md shadow-emerald-600/10 active:scale-95 transition"
            >
              <Play size={12} fill="white" />
              Tiếp tục
            </button>
            <button
              onClick={onEndGame}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-650 hover:bg-red-500 text-white font-bold text-xs uppercase rounded-lg shadow-md shadow-red-650/10 active:scale-95 transition"
            >
              <XOctagon size={12} fill="white" />
              Kết thúc
            </button>
          </div>
        )}

        {roomConfig.status === 'ended' && (
          <button
            onClick={onStartGame}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase rounded-lg active:scale-95 transition"
          >
            <Play size={14} fill="white" />
            Khởi động lại ván (Restart)
          </button>
        )}
      </div>

      {/* Free Camera Toggle */}
      <div className="pt-2 border-t border-slate-800">
        <button
          onClick={() => onSpectatePlayer(null)}
          disabled={spectatedPlayerId === null}
          className={`w-full flex items-center justify-center gap-2 py-1.5 border rounded-lg text-xs font-bold transition ${
            spectatedPlayerId === null
              ? "bg-slate-800 border-indigo-500/50 text-indigo-400"
              : "bg-slate-900 border-slate-750 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          {spectatedPlayerId === null ? <Eye size={14} /> : <EyeOff size={14} />}
          <span>Free Camera (Pan tự do)</span>
        </button>
      </div>

      {/* Spectator Climbers List */}
      <div className="flex-1 flex flex-col gap-1.5 max-h-40 overflow-y-auto">
        <div className="flex items-center gap-1 text-slate-500 text-[10px] font-semibold uppercase">
          <Users size={12} />
          <span>Theo dõi người chơi ({activePlayers.length})</span>
        </div>

        {activePlayers.length === 0 ? (
          <div className="text-[10px] text-slate-500 italic text-center py-2 bg-slate-950/30 border border-slate-900 rounded-md">
            Chưa có người chơi nào...
          </div>
        ) : (
          <div className="space-y-1">
            {activePlayers.map((player) => {
              const isSpectating = spectatedPlayerId === player.id;
              
              return (
                <button
                  key={player.id}
                  onClick={() => onSpectatePlayer(player.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition ${
                    isSpectating 
                      ? "bg-indigo-950/50 border border-indigo-750/30 text-white" 
                      : "bg-slate-950/40 hover:bg-slate-800 border border-slate-900 text-slate-300 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className="font-semibold truncate max-w-[120px]">{player.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-slate-500">{Math.round(player.height)}m</span>
                    {isSpectating ? (
                      <Eye size={12} className="text-indigo-400" />
                    ) : (
                      <EyeOff size={12} className="text-slate-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
