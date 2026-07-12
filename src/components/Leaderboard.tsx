import React, { useMemo } from 'react';
import { PlayerState } from '../types';
import { Trophy, Clock, Flag, Award, X, RotateCcw } from 'lucide-react';

interface LeaderboardProps {
  players: Record<string, PlayerState>;
  isOpen: boolean;
  onClose?: () => void;
  isGameOver?: boolean;
  isHost?: boolean;
  onRestartGame?: () => void; // Host only
  gameDuration?: number;
  localPlayerId?: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  players,
  isOpen,
  onClose,
  isGameOver = false,
  isHost = false,
  onRestartGame,
  gameDuration = 0,
  localPlayerId
}) => {
  if (!isOpen) return null;

  // Format finish time (elapsed time in seconds)
  const formatFinishTime = (secs: number) => {
    if (secs <= 0) return "--:--";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Stringify rank-relevant fields to cache sorting and prevent runs on coordinate changes
  const rankDependencies = Object.values(players)
    .filter(p => !p.isHost)
    .map(p => `${p.id}:${p.height}:${p.isFinished}:${p.finishTime}:${p.offline}`)
    .sort()
    .join('|');

  // Convert players object to sorted array
  // Sorting rules:
  // 1. Finished players come first, sorted by finishTime (ascending - faster time is better)
  // 2. Unfinished players come next, sorted by maxHeight (descending - higher is better)
  const sortedPlayers = useMemo(() => {
    return Object.values(players)
      .filter(p => !p.isHost) // Exclude host
      .sort((a, b) => {
        if (a.isFinished && !b.isFinished) return -1;
        if (!a.isFinished && b.isFinished) return 1;
        if (a.isFinished && b.isFinished) {
          return a.finishTime - b.finishTime;
        }
        return b.height - a.height;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankDependencies]);

  if (!isGameOver) {
    return (
      <div className="absolute top-32 left-4 z-40 w-72 max-w-[90vw] bg-slate-950/90 border border-slate-800 backdrop-blur-md rounded-xl p-3 shadow-2xl pointer-events-auto animate-slide-in select-none">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800/85">
          <div className="flex items-center gap-1.5 text-amber-400">
            <Trophy size={14} />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Bảng Xếp Hạng</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition"
              title="Đóng"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Players List */}
        <div className="space-y-1 max-h-[35vh] overflow-y-auto pr-0.5 scrollbar-thin">
          {sortedPlayers.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-500">Chưa có người chơi</div>
          ) : (
            sortedPlayers.map((player, idx) => {
              const rank = idx + 1;
              const isLocal = player.id === localPlayerId;
              
              let rankColor = "text-slate-400";
              if (rank === 1) rankColor = "text-amber-400 font-extrabold";
              else if (rank === 2) rankColor = "text-slate-300 font-extrabold";
              else if (rank === 3) rankColor = "text-amber-600 font-extrabold";

              return (
                <div 
                  key={player.id} 
                  className={`flex items-center justify-between p-1.5 rounded-lg text-xs transition ${
                    isLocal 
                      ? 'bg-indigo-600/20 border border-indigo-500/30' 
                      : 'hover:bg-slate-900/50 border border-transparent'
                  } ${player.offline ? 'opacity-50' : ''}`}
                >
                  {/* Left: Rank & Name */}
                  <div className="flex items-center gap-2 overflow-hidden mr-2">
                    <span className={`w-4 text-center font-mono font-bold text-[11px] ${rankColor}`}>
                      {rank}
                    </span>
                    <span 
                      className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className={`truncate font-semibold ${isLocal ? 'text-white font-extrabold' : 'text-slate-355'}`}>
                      {player.name} {player.offline ? '(off)' : ''}
                    </span>
                  </div>

                  {/* Right: Height & Checkpoint Status */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {player.checkpointId !== -1 && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">
                        <Flag size={8} />
                        #{player.checkpointId + 1}
                      </span>
                    )}
                    {player.isFinished ? (
                      <span className="text-[9px] font-black text-amber-500 uppercase">FIN</span>
                    ) : (
                      <span className="font-mono text-[10px] font-bold text-slate-300">
                        {Math.round(player.height)}m
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-slate-950 to-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 text-amber-400 bg-amber-500/10 rounded-lg">
              <Trophy size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-100 uppercase tracking-wide">
                {isGameOver ? "Kết Quả Chung Cuộc" : "Bảng Xếp Hạng Realtime"}
              </h3>
              <p className="text-xs text-slate-400">
                {isGameOver ? "Trận đấu đã kết thúc" : "Đồng bộ liên tục mỗi giây"}
              </p>
            </div>
          </div>
          {onClose && !isGameOver && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content Table */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {sortedPlayers.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              Chưa có người chơi nào tham gia phòng.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="py-3 pl-4 text-center w-12">Hạng</th>
                  <th className="py-3 pl-3">Người chơi</th>
                  <th className="py-3 text-right pr-6">Độ cao</th>
                  <th className="py-3 text-center w-28">Checkpoint</th>
                  <th className="py-3 text-right pr-4">Trạng thái / TG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {sortedPlayers.map((player, idx) => {
                  const rank = idx + 1;
                  let rankBadge = "";
                  
                  if (rank === 1) rankBadge = "bg-amber-500/20 text-amber-400 border border-amber-500/30";
                  else if (rank === 2) rankBadge = "bg-slate-300/20 text-slate-300 border border-slate-350/30";
                  else if (rank === 3) rankBadge = "bg-amber-700/20 text-amber-600 border border-amber-700/30";
                  else rankBadge = "bg-slate-850 text-slate-400 border border-slate-800";

                  return (
                    <tr 
                      key={player.id} 
                      className={`hover:bg-slate-850/40 transition-colors ${player.isFinished ? 'bg-amber-500/5' : ''}`}
                    >
                      {/* Rank */}
                      <td className="py-3.5 pl-4 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-extrabold ${rankBadge}`}>
                          {rank}
                        </span>
                      </td>

                      {/* Player Name */}
                      <td className="py-3.5 pl-3">
                        <div className="flex items-center gap-2.5">
                          <span 
                            className="w-3.5 h-3.5 rounded-full inline-block flex-shrink-0"
                            style={{ backgroundColor: player.color }}
                          />
                          <span className="font-bold text-slate-200 text-sm md:text-base">
                            {player.name}
                          </span>
                          {player.isFinished && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 font-bold rounded">
                              FINISHED
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Height */}
                      <td className="py-3.5 text-right pr-6 font-mono font-bold text-slate-200 text-sm">
                        {Math.round(player.height)}m
                      </td>

                      {/* Checkpoint */}
                      <td className="py-3.5 text-center text-sm font-semibold text-slate-400">
                        {player.checkpointId !== -1 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md text-xs">
                            <Flag size={12} />
                            #{player.checkpointId + 1}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">Chưa có</span>
                        )}
                      </td>

                      {/* Finish Status or Time */}
                      <td className="py-3.5 text-right pr-4">
                        {player.isFinished ? (
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 text-xs font-black text-amber-400">
                              <Clock size={12} />
                              {formatFinishTime(player.finishTime)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-indigo-400/90 font-medium italic">
                            Đang leo...
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Actions */}
        {isGameOver && (
          <div className="p-5 bg-slate-950/40 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-xs text-slate-400">
              Thời gian chơi tối đa: <span className="font-bold text-slate-200">{Math.round(gameDuration / 60)} phút</span>
            </div>
            
            <div className="flex gap-3">
              {isHost ? (
                <button
                  onClick={onRestartGame}
                  className="flex items-center justify-center gap-2 px-6 py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 active:scale-95 transition rounded-xl"
                >
                  <RotateCcw size={16} />
                  Chơi Lại (Restart)
                </button>
              ) : (
                <div className="text-sm text-amber-400 font-bold bg-amber-500/10 px-4 py-2 border border-amber-500/20 rounded-xl">
                  Chờ Host khởi tạo ván mới...
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
