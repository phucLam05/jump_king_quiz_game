import React from 'react';
import { Timer, ArrowUp, Flag, Trophy, Keyboard, Eye, HelpCircle, Coins } from 'lucide-react';

interface GameHUDProps {
  playerName: string;
  playerColor: string;
  height: number;
  checkpointId: number; // -1 if none
  timeRemaining: number; // in seconds
  rank: number;
  totalPlayers: number;
  showHelp: boolean;
  onToggleHelp: () => void;
  isHost: boolean;
  spectatedPlayerName: string | null;
  isInCheckpointZone: boolean;
  onSaveCheckpointTrigger: () => void;
  onToggleLeaderboard: () => void;
  coins?: number;
  shoeLevel: number;
  onUpgradeShoes?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  playerName,
  playerColor,
  height,
  checkpointId,
  timeRemaining,
  rank,
  totalPlayers,
  showHelp,
  onToggleHelp,
  isHost,
  spectatedPlayerName,
  isInCheckpointZone,
  onSaveCheckpointTrigger,
  onToggleLeaderboard,
  coins,
  shoeLevel,
  onUpgradeShoes
}) => {
  // Format time remaining
  const formatTime = (secs: number) => {
    if (secs < 0) return "00:00";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-x-0 top-0 z-40 pointer-events-none p-4 select-none h-full w-full">
      
      {/* Top Row: Game Stats */}
      <div className="flex flex-wrap justify-between items-start gap-3">
        
        {/* Left Side: Player Info & Height */}
        {!isHost ? (
          <div className="flex flex-col gap-2 pointer-events-auto">
            {/* Identity Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-700/55 backdrop-blur-md rounded-xl">
              <span 
                className="w-3.5 h-3.5 rounded-full inline-block animate-pulse"
                style={{ backgroundColor: playerColor }}
              />
              <span className="text-xs font-bold text-slate-200">{playerName}</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded-md">PLAYER</span>
            </div>

            {/* Stats Dashboard */}
            <div className="flex gap-2">
              {/* Heights Dashboard */}
              <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/55 backdrop-blur-md px-3.5 py-2 rounded-xl text-slate-200">
                <div className="text-indigo-400">
                  <ArrowUp size={18} />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Độ cao</div>
                  <div className="text-sm font-extrabold">{Math.round(height)}m</div>
                </div>
              </div>

              {/* Coins Dashboard */}
              <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/55 backdrop-blur-md px-3.5 py-2 rounded-xl text-slate-200">
                <div className="text-yellow-400">
                  <Coins size={18} />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Số xu</div>
                  <div className="text-sm font-extrabold text-yellow-400">{coins ?? 0}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Host Identity Badge */
          <div className="flex flex-col gap-2 pointer-events-auto">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/80 border border-slate-700/55 backdrop-blur-md rounded-xl">
              <span className="w-3.5 h-3.5 rounded-full inline-block bg-amber-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-200">{playerName}</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-md font-bold">HOST</span>
            </div>

            {spectatedPlayerName && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-950/80 border border-indigo-700/30 backdrop-blur-md rounded-xl text-indigo-200">
                <Eye size={14} className="animate-pulse" />
                <span className="text-xs">Đang xem: <span className="font-bold text-white">{spectatedPlayerName}</span></span>
              </div>
            )}
          </div>
        )}

        {/* Center: Timer & Global Ranks */}
        <div className="flex items-center gap-3 bg-slate-900/85 border border-slate-700/55 backdrop-blur-md px-4 py-2.5 rounded-2xl pointer-events-auto text-slate-100">
          <div className="flex items-center gap-1.5 text-indigo-400 pr-3 border-r border-slate-800">
            <Timer size={18} />
            <span className="font-mono font-bold text-base">{formatTime(timeRemaining)}</span>
          </div>
          
          {!isHost ? (
            <div className="flex items-center gap-1.5 text-amber-400">
              <Trophy size={16} />
              <span className="text-xs font-semibold">Hạng:</span>
              <span className="font-bold">{rank}</span>
              <span className="text-slate-500 text-[10px]">/{totalPlayers}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-400">
              <span className="text-xs font-semibold">Phòng:</span>
              <span className="font-bold text-slate-200">{totalPlayers} người chơi</span>
            </div>
          )}
        </div>

        {/* Right Side: Checkpoint Status & Help Toggle */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          {!isHost && (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/80 border border-slate-700/55 backdrop-blur-md rounded-xl text-slate-200">
              <Flag size={15} className={checkpointId !== -1 ? "text-emerald-400" : "text-slate-500"} />
              <span className="text-xs font-semibold">
                Checkpoint: {checkpointId !== -1 ? `#${checkpointId + 1}` : "Chưa có"}
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onToggleLeaderboard}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 border border-slate-700/55 backdrop-blur-md rounded-xl text-amber-400 hover:text-amber-200 transition"
            >
              <Trophy size={15} />
              <span className="text-xs font-semibold">Bảng điểm</span>
            </button>

            <button
              onClick={onToggleHelp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 border border-slate-700/55 backdrop-blur-md rounded-xl text-slate-400 hover:text-slate-200 transition"
            >
              <HelpCircle size={15} />
              <span className="text-xs font-semibold">{showHelp ? "Ẩn h.dẫn" : "Hiện h.dẫn"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Help Panel Overlay */}
      {showHelp && (
        <div className="absolute top-20 right-4 w-64 bg-slate-900/90 border border-slate-700/80 backdrop-blur-lg p-4 rounded-xl shadow-2xl pointer-events-auto text-slate-200 animate-slide-in">
          <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-800 text-indigo-400">
            <Keyboard size={16} />
            <h4 className="text-xs font-bold uppercase tracking-wider">Phím tắt di chuyển</h4>
          </div>
          
          {isHost ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">W / A / S / D</span> <span className="font-bold text-slate-200">Di chuyển Camera</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Giữ chuột kéo</span> <span className="font-bold text-slate-200">Pan Camera tự do</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Shift (Giữ)</span> <span className="font-bold text-slate-200">Tăng tốc Camera</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Esc</span> <span className="font-bold text-slate-200">Thoát / Menu Host</span></div>
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">A / D / ← / →</span> <span className="font-bold text-slate-200">Chạy & Ngắm nhảy</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Space (Giữ)</span> <span className="font-bold text-slate-200">Gồng lực nhảy</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Space (Thả)</span> <span className="font-bold text-slate-200">Phóng nhảy</span></div>
              <div className="flex justify-between"><span className="text-slate-400">R</span> <span className="font-bold text-slate-200">Về Checkpoint cũ</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Tab / Esc</span> <span className="font-bold text-slate-200">Xem Bảng xếp hạng</span></div>
            </div>
          )}
          
          <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-400 text-center">
            Có thể bấm phím <span className="font-bold text-slate-200 bg-slate-800 px-1 rounded">H</span> để ẩn bảng này.
          </div>
        </div>
      )}

      {/* Bottom Center: Floating Save Checkpoint Button */}
      {!isHost && isInCheckpointZone && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button
            onClick={onSaveCheckpointTrigger}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/40 text-white font-black text-xs md:text-sm uppercase rounded-2xl shadow-xl shadow-emerald-600/30 backdrop-blur-md transition transform active:scale-95 animate-bounce"
          >
            <Flag size={15} className="fill-white" />
            <span>Lưu Checkpoint <span className="hidden md:inline">(Nhấn E)</span></span>
          </button>
        </div>
      )}

      {/* Bottom Right: Shoe Upgrade Progress Status */}
      {!isHost && (
        <div className="absolute bottom-24 right-4 pointer-events-auto bg-slate-900/80 border border-slate-750 p-4 rounded-2xl shadow-xl w-64 select-none backdrop-blur-md flex flex-col gap-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cấp Độ Giày</span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${
              shoeLevel === 2
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}>
              {shoeLevel === 2 ? "Cấp 2 (Siêu Nhảy)" : "Cấp 1 (Thường)"}
            </span>
          </div>

          <div className="space-y-1.5">

            {shoeLevel === 1 && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={onUpgradeShoes}
                  disabled={(coins ?? 0) < 70}
                  className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black uppercase transition-all transform active:scale-[0.98] border shadow-md ${
                    (coins ?? 0) >= 70
                      ? "bg-gradient-to-r from-emerald-600 to-cyan-600 border-emerald-400 text-white cursor-pointer hover:brightness-110"
                      : "bg-slate-950/60 border-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <ArrowUp size={13} />
                  Lên Siêu Nhảy (70 xu)
                </button>
                <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                  <span>Tiến trình</span>
                  <span className="font-mono text-emerald-400">{coins}/70 xu</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(((coins ?? 0) / 70) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {shoeLevel === 2 && (
              <div className="py-1 text-center space-y-1">
                <div className="text-xs font-black text-cyan-400 flex items-center justify-center gap-1">
                  <span>⚡ GIÀY SIÊU NHẢY TỐI ĐA ⚡</span>
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Đôi giày tối tân nhất! Lực nhảy tăng cực đại để chinh phục đỉnh cao.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
