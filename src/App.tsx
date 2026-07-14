import React, { useState, useEffect, useRef, useMemo } from 'react';
import Phaser from 'phaser';
import { GameScene } from './game/GameScene';
import { MAPS } from './game/MapData';
import { Question, PlayerState, RoomConfig } from './types';
import { syncService } from './firebase';
import { QuizPopup } from './components/QuizPopup';
import { GameHUD } from './components/GameHUD';
import { Leaderboard } from './components/Leaderboard';
import { MobileControls } from './components/MobileControls';
import { HostControls } from './components/HostControls';
import { 
  Play, 
  Settings, 
  Gamepad2, 
  UserPlus, 
  Tv, 
  Database, 
  Trash2, 
  AlertTriangle, 
  X, 
  Clock, 
  Upload, 
  Sparkles,
  RefreshCw,
  LogOut,
  Check,
  Copy,
  Coins
} from 'lucide-react';

// Generates a random player color
const getRandomColor = () => {
  const colors = [
    '#f87171', '#fb923c', '#fbbf24', '#34d399', 
    '#2dd4bf', '#38bdf8', '#60a5fa', '#818cf8', 
    '#a78bfa', '#f472b6', '#e2e8f0'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Generates a random alphanumeric Room ID
const generateRoomId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generates a random Player ID
const generatePlayerId = () => {
  return 'player_' + Math.random().toString(36).substr(2, 9);
};

export default function App() {
  // Global App States
  const [screen, setScreen] = useState<'home' | 'host_setup' | 'join_setup' | 'lobby' | 'playing' | 'ended'>('home');
  const [roomId, setRoomId] = useState('');
  const [playerId, setPlayerId] = useState(generatePlayerId);
  const [playerName, setPlayerName] = useState('');
  const [playerColor, setPlayerColor] = useState(getRandomColor());
  const [isHost, setIsHost] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync data states
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [players, setPlayers] = useState<Record<string, PlayerState>>({});
  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Local Game States
  const [activeCheckpointId, setActiveCheckpointId] = useState<number>(-1);
  const [hasFinished, setHasFinished] = useState(false);
  const [finishTime, setFinishTime] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [localHeight, setLocalHeight] = useState(0);
  const [currentCheckpointZoneId, setCurrentCheckpointZoneId] = useState<number>(-1);

  // HUD & UI States
  const [showHelp, setShowHelp] = useState(true);
  const [showLeaderboardTab, setShowLeaderboardTab] = useState(false);
  const [spectatedPlayerId, setSpectatedPlayerId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  
  // Custom Firebase Settings
  const [showSettings, setShowSettings] = useState(false);
  const [firebaseConfigInput, setFirebaseConfigInput] = useState('');
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  // Host Setup States
  const [gameDurationSelect, setGameDurationSelect] = useState('300'); // 5 minutes default
  const [selectedMapId, setSelectedMapId] = useState('easy');
  const [questionsBank, setQuestionsBank] = useState<Question[]>([]);
  const [questionsFilename, setQuestionsFilename] = useState('');

  // Checkpoint Quiz States
  const [checkpointQuizOpen, setCheckpointQuizOpen] = useState(false);
  const [quizCheckpointId, setQuizCheckpointId] = useState<number>(-1);
  const [fallQuote, setFallQuote] = useState<string | null>(null);

  useEffect(() => {
    if (!fallQuote) return;
    const timer = setTimeout(() => {
      setFallQuote(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [fallQuote]);

  // Resume Countdown States
  const [resumeCountdown, setResumeCountdown] = useState<number | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  // Phaser Game References
  const [phaserGame, setPhaserGame] = useState<Phaser.Game | null>(null);
  const phaserContainerRef = useRef<HTMLDivElement>(null);

  // Keep refs in sync to avoid listener recreation on screen/game transitions
  const screenRef = useRef(screen);
  const phaserGameRef = useRef(phaserGame);
  
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  // Default open leaderboard when starting play, close when leaving
  useEffect(() => {
    if (screen === 'playing') {
      setShowLeaderboardTab(true);
    } else {
      setShowLeaderboardTab(false);
    }
  }, [screen]);

  useEffect(() => {
    phaserGameRef.current = phaserGame;
  }, [phaserGame]);

  // Resume countdown timer logic
  useEffect(() => {
    if (resumeCountdown === null) return;

    let timer: NodeJS.Timeout | undefined;

    if (resumeCountdown > 0) {
      if (phaserGameRef.current && phaserGameRef.current.scene.isActive('GameScene')) {
        const scene = phaserGameRef.current.scene.keys['GameScene'] as GameScene;
        scene.setGamePaused(true);
      }

      timer = setTimeout(() => {
        setResumeCountdown(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else {
      if (phaserGameRef.current && phaserGameRef.current.scene.isActive('GameScene')) {
        const scene = phaserGameRef.current.scene.keys['GameScene'] as GameScene;
        scene.setGamePaused(false);
      }
      setResumeCountdown(null);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resumeCountdown]);

  // Listen to Phaser checkpoint enter/leave events
  useEffect(() => {
    const handleEnterCP = (e: Event) => {
      const customEvent = e as CustomEvent;
      setCurrentCheckpointZoneId(customEvent.detail.id);
    };

    const handleLeaveCP = () => {
      setCurrentCheckpointZoneId(-1);
    };

    const handleAdminTeleportRequest = (e: Event) => {
      if (!roomId) return;
      const customEvent = e as CustomEvent;
      const { playerId: targetPlayerId, playerName } = customEvent.detail;
      
      const activeMapId = roomConfig?.mapId || selectedMapId;
      const mapCheckpoints = MAPS[activeMapId]?.checkpoints || [];
      
      if (mapCheckpoints.length === 0) {
        alert("Bản đồ này không cấu hình checkpoint nào để dịch chuyển!");
        return;
      }

      let promptMsg = `Dịch chuyển người chơi "${playerName}" đến checkpoint nào?\n`;
      mapCheckpoints.forEach((cp, idx) => {
        promptMsg += `- Nhập ${idx} để đưa tới Checkpoint #${idx + 1} (Tọa độ y: ${cp.y})\n`;
      });

      const choice = prompt(promptMsg);
      if (choice === null) return; // Cancelled

      const choiceIdx = parseInt(choice, 10);
      if (isNaN(choiceIdx) || choiceIdx < 0 || choiceIdx >= mapCheckpoints.length) {
        alert("Lựa chọn không hợp lệ!");
        return;
      }

      const targetCP = mapCheckpoints[choiceIdx];
      syncService.updatePlayer(roomId, targetPlayerId, {
        teleportTarget: {
          x: targetCP.x,
          y: targetCP.y,
          time: Date.now()
        }
      });
    };

    const handleLocalPlayerTeleported = (e: Event) => {
      if (!roomId || !playerId) return;
      const customEvent = e as CustomEvent;
      const { x, y } = customEvent.detail;
      
      syncService.updatePlayer(roomId, playerId, {
        teleportTarget: null,
        x: x,
        y: y,
        vx: 0,
        vy: 0
      });
    };

    const handleCoinCollected = (e: Event) => {
      if (!roomId || !playerId) return;
      const customEvent = e as CustomEvent;
      const { value } = customEvent.detail;
      
      const currentCoins = playersRef.current[playerId]?.coins || 0;
      syncService.updatePlayer(roomId, playerId, {
        coins: currentCoins + value
      });
    };

    const handlePlayerLongFall = () => {
      setFallQuote("Bạn đã trở thành nạn nhân của quy luật cạnh tranh khốc liệt");
    };

    window.addEventListener('enter_checkpoint', handleEnterCP);
    window.addEventListener('leave_checkpoint', handleLeaveCP);
    window.addEventListener('admin_teleport_request', handleAdminTeleportRequest);
    window.addEventListener('local_player_teleported', handleLocalPlayerTeleported);
    window.addEventListener('coin_collected', handleCoinCollected);
    window.addEventListener('player_long_fall', handlePlayerLongFall);

    return () => {
      window.removeEventListener('enter_checkpoint', handleEnterCP);
      window.removeEventListener('leave_checkpoint', handleLeaveCP);
      window.removeEventListener('admin_teleport_request', handleAdminTeleportRequest);
      window.removeEventListener('local_player_teleported', handleLocalPlayerTeleported);
      window.removeEventListener('coin_collected', handleCoinCollected);
      window.removeEventListener('player_long_fall', handlePlayerLongFall);
    };
  }, [roomId, roomConfig, selectedMapId, playerId]);

  // Initialize Custom Firebase if saved
  useEffect(() => {
    const savedConfig = syncService.getSavedFirebaseConfig();
    if (savedConfig) {
      setFirebaseConfigInput(JSON.stringify(savedConfig, null, 2));
      setIsFirebaseConnected(syncService.getMode() === 'firebase');
    }
  }, []);

  // Sync Room Config and Players lists (Subscribed exactly once per Room ID)
  useEffect(() => {
    if (!roomId) return;

    // Listen to room updates
    const unsubscribeRoom = syncService.onRoomUpdate(roomId, (config) => {
      if (config) {
        setRoomConfig(config);
        
        const prevStatus = prevStatusRef.current;
        prevStatusRef.current = config.status;

        // Sync pause/resume status with Phaser
        if (phaserGameRef.current && phaserGameRef.current.scene.isActive('GameScene')) {
          const scene = phaserGameRef.current.scene.keys['GameScene'] as GameScene;
          if (config.status === 'paused') {
            scene.setGamePaused(true);
          } else if (config.status === 'playing') {
            if (prevStatus === 'paused') {
              setResumeCountdown(3);
            } else {
              scene.setGamePaused(false);
            }
          } else {
            scene.setGamePaused(false);
          }
        }
        
        // Handle Game Status Transitions
        if (config.status === 'playing' && screenRef.current === 'lobby') {
          setScreen('playing');
        } else if (config.status === 'ended' && (screenRef.current === 'playing' || screenRef.current === 'lobby')) {
          setScreen('ended');
          // Clean up phaser game
          if (phaserGameRef.current) {
            phaserGameRef.current.destroy(true);
            setPhaserGame(null);
          }
        } else if (config.status === 'waiting' && screenRef.current === 'ended') {
          // Reset states for replays
          setActiveCheckpointId(-1);
          setHasFinished(false);
          setFinishTime(0);
          setLocalHeight(0);
          setScreen('lobby');
        }
      } else {
        // Room deleted
        if (screenRef.current !== 'home') {
          handleLeaveRoom();
          setErrorMsg('Phòng đã bị Host giải tán.');
        }
      }
    });

    // Listen to player updates
    const unsubscribePlayers = syncService.onPlayersUpdate(roomId, (updatedPlayers) => {
      setPlayers(updatedPlayers);
      
      // Pass player state updates directly to Phaser scene if running
      if (phaserGameRef.current && phaserGameRef.current.scene.isActive('GameScene')) {
        const scene = phaserGameRef.current.scene.keys['GameScene'] as GameScene;
        scene.updatePlayers(updatedPlayers);
      }
    });

    return () => {
      unsubscribeRoom();
      unsubscribePlayers();
    };
  }, [roomId]);

  // Game timer countdown loop
  useEffect(() => {
    if (screen !== 'playing' || !roomConfig || roomConfig.duration === 0) {
      return;
    }

    if (roomConfig.status === 'paused' || roomConfig.startTime === 0) {
      setTimeRemaining(roomConfig.duration);
      return;
    }

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - roomConfig.startTime) / 1000);
      const remaining = roomConfig.duration - elapsed;
      
      if (remaining <= 0) {
        setTimeRemaining(0);
        clearInterval(timer);
        
        // Host ends the game when time runs out
        if (isHost) {
          syncService.updateRoom(roomId, { status: 'ended' });
        }
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [screen, roomConfig, isHost, roomId]);



  // Listen to global key shortcuts for HUD and Respawn
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'playing') return;

      if (e.key.toLowerCase() === 'h') {
        setShowHelp(prev => !prev);
      }
      
      if (e.key === 'Tab') {
        e.preventDefault();
        setShowLeaderboardTab(prev => !prev);
      }

      if (e.key === 'Escape') {
        setShowLeaderboardTab(prev => !prev);
      }

      if (e.key.toLowerCase() === 'e') {
        if (currentCheckpointZoneId >= 0 && currentCheckpointZoneId > activeCheckpointId && !checkpointQuizOpen && !showSettings) {
          setQuizCheckpointId(currentCheckpointZoneId);
          setCheckpointQuizOpen(true);
        }
      }

    };

    // Keyboard listener for Phaser-triggered Respawn
    const handleKbdRespawn = () => {
      handleRespawn();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('kbd_respawn', handleKbdRespawn);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('kbd_respawn', handleKbdRespawn);
    };
  }, [screen, currentCheckpointZoneId, activeCheckpointId, checkpointQuizOpen, showSettings, roomConfig, hasFinished, roomId, playerId]);

  // Load Phaser game inside effect when screen changes to 'playing'
  useEffect(() => {
    if (screen !== 'playing' || !roomId || !roomConfig) return;

    const mapConfig = MAPS[roomConfig.mapId] || MAPS.easy;

    const phaserConfig: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: Math.min(window.innerWidth, mapConfig.width),
      height: window.innerHeight,
      parent: 'game-container',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      },
      scene: [GameScene]
    };

    const game = new Phaser.Game(phaserConfig);
    
    // Pass initial setup parameters
    game.scene.start('GameScene', {
      roomId,
      playerId,
      playerName: playerName || (isHost ? 'Host' : 'Player'),
      playerColor,
      isHost,
      mapId: roomConfig.mapId,
      isInitiallyPaused: roomConfig.status === 'paused',
      onReachCheckpoint: (id: number) => handleReachCheckpoint(id),
      onReachGoal: () => handleReachGoal(),
      onPositionUpdate: (pos: any) => handlePositionUpdate(pos),
      onHostCameraUpdate: (cx: number, cy: number) => {}
    });

    setPhaserGame(game);

    // Dynamic resize listener to scale game canvas width correctly
    const handleResize = () => {
      if (game && game.scale) {
        game.scale.resize(Math.min(window.innerWidth, mapConfig.width), window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      game.destroy(true);
      setPhaserGame(null);
    };
  }, [screen]);

  // --- HOST ACTIONS ---

  const handleLoadDefaultQuestions = async () => {
    try {
      const res = await fetch('/default_questions.json');
      const data = await res.json();
      setQuestionsBank(data);
      setQuestionsFilename('default_questions.json (Sẵn có)');
    } catch (err) {
      console.error("Failed to load default questions", err);
      // Fallback questions hardcoded
      const fallback: Question[] = [
        { question: "2 + 2 = ?", answers: ["3", "4", "5", "6"], correct: 1 },
        { question: "Thủ đô của Việt Nam là gì?", answers: ["Hồ Chí Minh", "Đà Nẵng", "Hà Nội", "Huế"], correct: 2 },
        { question: "Trái Đất quay quanh mặt trời mất bao lâu?", answers: ["24 giờ", "30 ngày", "365 ngày", "12 tháng"], correct: 2 }
      ];
      setQuestionsBank(fallback);
      setQuestionsFilename('Câu hỏi mẫu (Tự tạo)');
    }
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setQuestionsFilename(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          // Basic validation
          const isValid = json.every(q => q.question && Array.isArray(q.answers) && typeof q.correct === 'number');
          if (isValid) {
            setQuestionsBank(json);
            setErrorMsg('');
          } else {
            setErrorMsg('Cấu trúc file JSON câu hỏi không hợp lệ.');
          }
        } else {
          setErrorMsg('File JSON phải chứa một mảng câu hỏi.');
        }
      } catch (err) {
        setErrorMsg('Lỗi đọc file JSON câu hỏi.');
      }
    };
    reader.readAsText(file);
  };

  const handleCreateRoom = async () => {
    let quizData = questionsBank;
    if (quizData.length === 0) {
      // Auto load defaults if host didn't load any
      try {
        const res = await fetch('/default_questions.json');
        quizData = await res.json();
      } catch (err) {
        quizData = [
          { question: "2 + 2 = ?", answers: ["3", "4", "5", "6"], correct: 1 },
          { question: "Hành tinh nào gần Mặt trời nhất?", answers: ["Sao Kim", "Sao Thủy", "Sao Hỏa", "Trái Đất"], correct: 1 }
        ];
      }
    }

    const rId = 'room_' + generateRoomId();
    setIsHost(true);
    setRoomId(rId);
    setPlayerName(playerName.trim() || "Host");
    
    const duration = parseInt(gameDurationSelect, 10);
    const hostPlayer: PlayerState = {
      id: playerId,
      name: playerName.trim() || "Host",
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      height: 0,
      checkpointId: -1,
      isFinished: false,
      finishTime: 0,
      color: playerColor,
      isHost: true,
      lastActive: Date.now(),
      coins: 0
    };

    const config: RoomConfig = {
      status: 'waiting',
      duration,
      startTime: 0,
      mapId: selectedMapId,
      quizData,
      hostId: playerId
    };

    try {
      await syncService.createRoom(rId, hostPlayer, config);
      setScreen('lobby');
      setErrorMsg('');
    } catch (err) {
      setErrorMsg('Tạo phòng thất bại: ' + err);
    }
  };

  const handleStartGame = async () => {
    if (!roomId) return;
    try {
      await syncService.updateRoom(roomId, {
        status: 'playing',
        startTime: Date.now()
      });
      setTimeRemaining(roomConfig?.duration || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStopGame = async () => {
    if (!roomId || !roomConfig) return;
    try {
      const elapsed = Math.floor((Date.now() - roomConfig.startTime) / 1000);
      const remaining = Math.max(0, roomConfig.duration - elapsed);
      await syncService.updateRoom(roomId, {
        status: 'paused',
        duration: remaining,
        startTime: 0
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEndGame = async () => {
    if (!roomId) return;
    try {
      await syncService.updateRoom(roomId, {
        status: 'ended'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestartGame = async () => {
    if (!roomId || !roomConfig) return;
    
    // Reset all player parameters in Database
    const resetPlayers = { ...players };
    Object.keys(resetPlayers).forEach(pid => {
      resetPlayers[pid] = {
        ...resetPlayers[pid],
        height: 0,
        checkpointId: -1,
        isFinished: false,
        finishTime: 0,
        coins: 0,
        shoeLevel: 0,
        isFlying: false,
        teleportTarget: null
      };
      
      // Update individual player nodes in Firebase or BroadcastChannel
      syncService.updatePlayer(roomId, pid, resetPlayers[pid]);
    });

    try {
      await syncService.updateRoom(roomId, {
        status: 'waiting',
        startTime: 0
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSpectatePlayer = (pid: string | null) => {
    setSpectatedPlayerId(pid);
    if (phaserGame && phaserGame.scene.isActive('GameScene')) {
      const scene = phaserGame.scene.keys['GameScene'] as GameScene;
      scene.spectatePlayer(pid);
    }
  };

  // --- PLAYER ACTIONS ---

  const handleJoinRoom = async () => {
    const cleanName = playerName.trim();
    const cleanRoomId = roomId.trim();

    if (!cleanName) {
      setErrorMsg('Vui lòng nhập tên của bạn.');
      return;
    }
    if (!cleanRoomId) {
      setErrorMsg('Vui lòng nhập Mã phòng (Room ID).');
      return;
    }

    setIsHost(false);
    setErrorMsg('Đang tham gia...');

    try {
      const existingPlayer = await syncService.getPlayerByName(cleanRoomId, cleanName);

      if (existingPlayer) {
        if (!existingPlayer.offline) {
          setErrorMsg(existingPlayer.isHost 
            ? 'Host hiện đang hoạt động và làm chủ phòng.' 
            : 'Tên người chơi này đang hoạt động trong phòng.'
          );
          return;
        }

        // --- RECONNECT FLOW ---
        setErrorMsg('Đang khôi phục phiên chơi...');
        
        const config = await syncService.getRoomConfig(cleanRoomId);

        if (!config) {
          setErrorMsg('Không tìm thấy phòng game này.');
          return;
        }

        // Restore identities
        setPlayerId(existingPlayer.id);
        setIsHost(existingPlayer.isHost);
        setRoomId(cleanRoomId);
        
        if (!existingPlayer.isHost) {
          setPlayerColor(existingPlayer.color);
          setActiveCheckpointId(existingPlayer.checkpointId);
          setHasFinished(existingPlayer.isFinished);
          setFinishTime(existingPlayer.finishTime);
        }

        try {
          // Restore offline status
          await syncService.updatePlayer(cleanRoomId, existingPlayer.id, { offline: false });
          setScreen(config.status === 'playing' ? 'playing' : (config.status === 'ended' ? 'ended' : 'lobby'));
          setErrorMsg('');
        } catch (err) {
          setErrorMsg('Khôi phục kết nối thất bại: ' + err);
        }
        return;
      }

      // --- NEW PLAYER JOIN FLOW ---
      const config = await syncService.getRoomConfig(cleanRoomId);

      if (!config) {
        setErrorMsg('Không tìm thấy phòng game này.');
        return;
      }

      if (config.status === 'playing') {
        setErrorMsg('Ván đấu đã bắt đầu, không thể tham gia lúc này.');
        return;
      }

      const mapConfig = MAPS[config.mapId] || MAPS.easy;
      const player: PlayerState = {
        id: playerId,
        name: cleanName,
        x: mapConfig.spawnX,
        y: mapConfig.spawnY,
        vx: 0,
        vy: 0,
        height: 0,
        checkpointId: -1,
        isFinished: false,
        finishTime: 0,
        color: playerColor,
        isHost: false,
        lastActive: Date.now(),
        offline: false,
        coins: 0
      };

      try {
        await syncService.joinRoom(cleanRoomId, player);
        setRoomId(cleanRoomId);
        setScreen('lobby');
        setErrorMsg('');
      } catch (err) {
        setErrorMsg('Tham gia phòng thất bại: ' + err);
      }
    } catch (err) {
      setErrorMsg('Kiểm tra phòng thất bại: ' + err);
    }
  };

  const handleLeaveRoom = async () => {
    if (roomId) {
      if (isHost) {
        await syncService.deleteRoom(roomId);
      } else {
        await syncService.leaveRoom(roomId, playerId);
      }
    }

    // Clean up Phaser
    if (phaserGame) {
      phaserGame.destroy(true);
      setPhaserGame(null);
    }

    // Reset local states
    setRoomId('');
    setRoomConfig(null);
    setPlayers({});
    setIsHost(false);
    setActiveCheckpointId(-1);
    setHasFinished(false);
    setFinishTime(0);
    setLocalHeight(0);
    setScreen('home');
    setErrorMsg('');
  };

  // --- GAMEPLAY TRIGGERS ---

  const handlePositionUpdate = (pos: { x: number; y: number; vx: number; vy: number; height: number }) => {
    setLocalHeight(pos.height);
    
    // Sync to database
    if (roomId) {
      syncService.updatePlayer(roomId, playerId, {
        x: pos.x,
        y: pos.y,
        vx: pos.vx,
        vy: pos.vy,
        height: pos.height
      });
    }
  };

  const handleSaveCheckpointTrigger = () => {
    if (currentCheckpointZoneId >= 0 && currentCheckpointZoneId > activeCheckpointId && !checkpointQuizOpen && !showSettings) {
      setQuizCheckpointId(currentCheckpointZoneId);
      setCheckpointQuizOpen(true);
    }
  };

  const handleReachCheckpoint = (checkpointId: number) => {
    // Only trigger quiz if player has not saved this checkpoint yet
    if (checkpointId > activeCheckpointId && !checkpointQuizOpen) {
      setQuizCheckpointId(checkpointId);
      setCheckpointQuizOpen(true);
    }
  };

  const handleUpgradeShoes = () => {
    if (isHost || screen !== 'playing' || hasFinished || !roomId || !playerId) return;
    const currentCoins = playersRef.current[playerId]?.coins || 0;
    const currentShoeLevel = playersRef.current[playerId]?.shoeLevel || 0;
    
    if (currentShoeLevel === 0 && currentCoins >= 30) {
      syncService.updatePlayer(roomId, playerId, {
        coins: currentCoins - 30,
        shoeLevel: 1
      });
      const event = new CustomEvent('shoes_upgraded', { detail: { level: 1 } });
      window.dispatchEvent(event);
    } else if (currentShoeLevel === 1 && currentCoins >= 70) {
      syncService.updatePlayer(roomId, playerId, {
        coins: currentCoins - 70,
        shoeLevel: 2
      });
      const event = new CustomEvent('shoes_upgraded', { detail: { level: 2 } });
      window.dispatchEvent(event);
    }
  };

  const handleReachGoal = () => {
    if (hasFinished || !roomConfig) return;

    const elapsed = (Date.now() - roomConfig.startTime) / 1000;
    setHasFinished(true);
    setFinishTime(elapsed);

    // Sync finish parameters
    if (roomId) {
      syncService.updatePlayer(roomId, playerId, {
        isFinished: true,
        finishTime: elapsed
      });
    }
  };

  const handleSaveCheckpointSuccess = () => {
    setCheckpointQuizOpen(false);

    setActiveCheckpointId(quizCheckpointId);
    if (roomId) {
      syncService.updatePlayer(roomId, playerId, {
        checkpointId: quizCheckpointId
      });
    }
  };

  const handleRespawn = () => {
    if (isHost || !phaserGame || !roomConfig) return;

    const mapConfig = MAPS[roomConfig.mapId] || MAPS.easy;
    let spawnX = mapConfig.spawnX;
    let spawnY = mapConfig.spawnY;

    if (activeCheckpointId >= 0 && activeCheckpointId < mapConfig.checkpoints.length) {
      const cp = mapConfig.checkpoints[activeCheckpointId];
      spawnX = cp.x;
      spawnY = cp.y;
    }

    const scene = phaserGame.scene.keys['GameScene'] as GameScene;
    scene.respawnTo(spawnX, spawnY);
  };

  // --- SETTINGS CONTROLS ---

  const handleSaveFirebaseSettings = () => {
    if (!firebaseConfigInput.trim()) {
      syncService.clearSavedFirebaseConfig();
      setIsFirebaseConnected(false);
      setShowSettings(false);
      return;
    }

    try {
      const configObj = JSON.parse(firebaseConfigInput);
      syncService.saveFirebaseConfig(configObj);
      setIsFirebaseConnected(syncService.getMode() === 'firebase');
      setShowSettings(false);
      setErrorMsg('');
    } catch (err) {
      alert("Cấu hình Firebase JSON không đúng định dạng!");
    }
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Stringify rank-relevant fields to cache sorting and prevent runs on coordinate changes
  const rankDependencies = Object.values(players)
    .filter(p => !p.isHost)
    .map(p => `${p.id}:${p.height}:${p.isFinished}:${p.finishTime}:${p.offline}`)
    .sort()
    .join('|');

  // Memoize rank calculation to avoid sorting on every position update packet
  const localRank = useMemo(() => {
    const list = Object.values(players).filter(p => !p.isHost);
    const sorted = list.sort((a, b) => {
      if (a.isFinished && !b.isFinished) return -1;
      if (!a.isFinished && b.isFinished) return 1;
      if (a.isFinished && b.isFinished) return a.finishTime - b.finishTime;
      return b.height - a.height;
    });
    const idx = sorted.findIndex(p => p.id === playerId);
    return idx !== -1 ? idx + 1 : 1;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankDependencies, playerId]);

  const activePlayerId = isHost ? spectatedPlayerId : playerId;
  const activeCoins = activePlayerId ? (players[activePlayerId]?.coins || 0) : 0;
  const activeShoeLevel = activePlayerId ? (players[activePlayerId]?.shoeLevel || 0) : 0;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-brand-dark flex items-center justify-center">
      
      {/* 1. HOME SCREEN */}
      {screen === 'home' && (
        <div className="w-full max-w-md p-6 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl relative z-10 space-y-6 mx-4 animate-fade-in">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-indigo-600/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
              <Gamepad2 size={36} className="animate-pulse" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400 bg-clip-text text-transparent">
              Jump Quiz Multiplayer
            </h1>
            <p className="text-slate-400 text-xs md:text-sm">Real-time vertical climbing quiz-checkpoint game</p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-2">
              <AlertTriangle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Tabs */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => { setScreen('host_setup'); setErrorMsg(''); }}
              className="flex flex-col items-center justify-center p-5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition active:scale-95 space-y-2 text-white border border-indigo-500/20"
            >
              <Tv size={24} />
              <span className="font-bold text-xs uppercase tracking-wider">Tạo phòng Host</span>
            </button>

            <button
              onClick={() => { setScreen('join_setup'); setErrorMsg(''); }}
              className="flex flex-col items-center justify-center p-5 bg-slate-800 hover:bg-slate-750 rounded-2xl border border-slate-700 hover:text-white transition active:scale-95 space-y-2 text-slate-300"
            >
              <UserPlus size={24} />
              <span className="font-bold text-xs uppercase tracking-wider">Vào chơi Game</span>
            </button>
          </div>

          {/* Database Info Indicator */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-2xl border border-slate-850/80 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Database size={15} className={isFirebaseConnected ? "text-emerald-400 animate-pulse" : "text-slate-500"} />
              <span>Kênh: <span className="font-semibold text-slate-200">{isFirebaseConnected ? "Firebase (Internet)" : "Broadcast (Local Multi-Tab)"}</span></span>
            </div>
            
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1 font-bold text-[10px] text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2 py-1 border border-indigo-500/10 rounded-lg transition"
            >
              <Settings size={12} />
              <span>Cấu hình</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. HOST SETUP SCREEN */}
      {screen === 'host_setup' && (
        <div className="w-full max-w-lg p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl relative z-10 space-y-5 mx-4 animate-slide-in">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Tv size={20} className="text-indigo-400" />
              <span>Cài đặt phòng chơi Host</span>
            </h2>
            <button
              onClick={() => setScreen('home')}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
            >
              <X size={18} />
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold text-center">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            {/* Host Name */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tên hiển thị Host</label>
              <input
                type="text"
                placeholder="Ví dụ: Admin, Trọng tài..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.slice(0, 16))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>



            {/* Two Column Layout: Time & Map */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Thời lượng trận</label>
                <select
                  value={gameDurationSelect}
                  onChange={(e) => setGameDurationSelect(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="60">1 phút</option>
                  <option value="180">3 phút</option>
                  <option value="300">5 phút</option>
                  <option value="600">10 phút</option>
                  <option value="1200">20 phút</option>
                  <option value="0">Vô hạn (Không thời gian)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bản đồ (Map)</label>
                <select
                  value={selectedMapId}
                  onChange={(e) => setSelectedMapId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="easy">Easy Climb (Dễ)</option>
                  <option value="hard">Apex Ascent (Khó)</option>
                  <option value="nightmare">Nightmare Climb (Siêu Khó)</option>
                  <option value="goingup">Going Up (Hành Trình Kinh Tế)</option>
                </select>
              </div>
            </div>

            {/* Quiz JSON upload */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Bộ câu hỏi Checkpoint (.JSON)
              </label>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Upload Button */}
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl hover:border-slate-700 cursor-pointer text-slate-400 hover:text-slate-200 transition text-xs font-semibold select-none">
                  <Upload size={14} />
                  <span>{questionsFilename ? "Đổi file JSON" : "Tải file câu hỏi JSON"}</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleJsonUpload}
                    className="hidden"
                  />
                </label>

                {/* Default load button */}
                <button
                  type="button"
                  onClick={handleLoadDefaultQuestions}
                  className="px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/15 hover:border-indigo-500/35 text-indigo-400 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Sparkles size={13} />
                  <span>Dùng câu hỏi mẫu</span>
                </button>
              </div>

              {questionsFilename && (
                <div className="mt-2 text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 block animate-ping" />
                  <span>Đã nạp: {questionsFilename} ({questionsBank.length} câu hỏi)</span>
                </div>
              )}
            </div>
          </div>

          {/* Action button */}
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              onClick={() => setScreen('home')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition"
            >
              Hủy
            </button>
            <button
              onClick={handleCreateRoom}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/10 active:scale-95 transition"
            >
              Tạo phòng
            </button>
          </div>

        </div>
      )}

      {/* 3. JOIN SCREEN */}
      {screen === 'join_setup' && (
        <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl relative z-10 space-y-5 mx-4 animate-slide-in">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <UserPlus size={20} className="text-indigo-400" />
              <span>Vào phòng game chơi</span>
            </h2>
            <button
              onClick={() => setScreen('home')}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
            >
              <X size={18} />
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold text-center">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            {/* Player Name */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tên người chơi *</label>
              <input
                type="text"
                placeholder="Nhập tên leo núi của bạn..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.slice(0, 14))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Room ID */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mã phòng (Room ID) *</label>
              <input
                type="text"
                placeholder="Ví dụ: room_ABC123..."
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.trim())}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition font-mono"
              />
            </div>

            {/* Color selection */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Màu sắc nhân vật</label>
              <div className="flex flex-wrap gap-2.5 justify-center p-3 bg-slate-950/60 rounded-2xl border border-slate-850">
                {[
                  '#f87171', '#fb923c', '#fbbf24', '#34d399', 
                  '#2dd4bf', '#38bdf8', '#60a5fa', '#818cf8', 
                  '#a78bfa', '#f472b6', '#e2e8f0'
                ].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setPlayerColor(color)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      playerColor === color 
                        ? "scale-125 ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900" 
                        : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              onClick={() => setScreen('home')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition"
            >
              Hủy
            </button>
            <button
              onClick={handleJoinRoom}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/10 active:scale-95 transition"
            >
              Tham gia
            </button>
          </div>

        </div>
      )}

      {/* 4. ROOM LOBBY SCREEN */}
      {screen === 'lobby' && roomConfig && (
        <div className="w-full max-w-xl p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl relative z-10 space-y-6 mx-4 animate-slide-in">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-800">
            <div>
              <span className="text-[10px] text-indigo-400 font-black tracking-widest uppercase">Phòng chơi Multiplayer</span>
              <h2 className="text-2xl font-black text-white leading-5">{roomId}</h2>
            </div>
            
            <button
              onClick={handleLeaveRoom}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/25 rounded-xl text-xs font-bold transition"
            >
              <LogOut size={14} />
              <span>{isHost ? "Giải tán phòng" : "Rời phòng"}</span>
            </button>
          </div>

          {/* Room Settings Details Grid */}
          <div className="grid grid-cols-3 gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-850">
            <div className="text-center p-2 border-r border-slate-850">
              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Bản đồ</div>
              <div className="text-xs font-bold text-slate-200">{MAPS[roomConfig.mapId]?.name || "Easy"}</div>
            </div>
            
            <div className="text-center p-2 border-r border-slate-850">
              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Thời gian tối đa</div>
              <div className="text-xs font-bold text-slate-200">
                {roomConfig.duration > 0 ? `${roomConfig.duration / 60} phút` : "Vô hạn"}
              </div>
            </div>

            <div className="text-center p-2">
              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Câu hỏi</div>
              <div className="text-xs font-bold text-slate-200">{roomConfig.quizData?.length || 0} câu</div>
            </div>
          </div>

          {/* Lobby Players List */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Danh sách người chờ ({Object.keys(players).filter(pid => !players[pid].isHost).length})
            </span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
              {Object.values(players).map((p) => {
                if (p.isHost) return null; // Hide host from climber lists
                return (
                  <div 
                    key={p.id}
                    className="flex items-center gap-3 p-3 bg-slate-950/40 border border-slate-850/80 rounded-xl"
                  >
                    <span 
                      className="w-3.5 h-3.5 rounded-full inline-block animate-pulse" 
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="font-semibold text-slate-200 text-sm truncate">{p.name}</span>
                    {p.id === playerId && (
                      <span className="ml-auto text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/10">
                        BẠN
                      </span>
                    )}
                  </div>
                );
              })}
              
              {Object.keys(players).filter(pid => !players[pid].isHost).length === 0 && (
                <div className="col-span-2 text-center text-xs text-slate-500 py-6 italic">
                  Chờ người chơi khác tham gia bằng Room ID...
                </div>
              )}
            </div>
          </div>

          {/* Copy Share Link */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-2xl border border-slate-850/80 text-xs">
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block mb-0.5">Mã phòng để chia sẻ</span>
              <span className="font-mono font-bold text-slate-300">{roomId}</span>
            </div>
            <button
              onClick={handleCopyRoomId}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-xl transition font-bold"
            >
              {copiedId ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  <span>Đã sao chép!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy ID</span>
                </>
              )}
            </button>
          </div>

          {/* Trigger Play button */}
          <div className="pt-4 border-t border-slate-850 flex justify-end">
            {isHost ? (
              <button
                onClick={handleStartGame}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm uppercase rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-95 transition"
              >
                <Play size={16} fill="white" />
                <span>Bắt đầu ván đấu</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-amber-500 font-bold bg-amber-500/10 px-4 py-2 border border-amber-500/20 rounded-xl animate-pulse text-xs uppercase">
                <RefreshCw size={14} className="animate-spin" />
                <span>Chờ Host bắt đầu ván...</span>
              </div>
            )}
          </div>

        </div>
      )}

      {/* 5. PLAYING SCREEN (GAMEPLAY INSTANCE) */}
      {screen === 'playing' && roomConfig && (
        <div className="w-full h-full relative overflow-hidden bg-slate-950 select-none">
          {/* Phaser Canvas Container */}
          <div 
            id="game-container" 
            ref={phaserContainerRef}
            className="w-full h-full flex items-center justify-center"
          />

          {/* Realtime Floating HUD */}
          <GameHUD
            playerName={playerName || 'Player'}
            playerColor={playerColor}
            height={localHeight}
            checkpointId={activeCheckpointId}
            timeRemaining={timeRemaining}
            rank={localRank}
            totalPlayers={Object.keys(players).filter(pid => !players[pid].isHost).length}
            showHelp={showHelp}
            onToggleHelp={() => setShowHelp(prev => !prev)}
            isHost={isHost}
            spectatedPlayerName={spectatedPlayerId ? (players[spectatedPlayerId]?.name || null) : null}
            isInCheckpointZone={currentCheckpointZoneId >= 0 && currentCheckpointZoneId > activeCheckpointId}
            onSaveCheckpointTrigger={handleSaveCheckpointTrigger}
            onToggleLeaderboard={() => setShowLeaderboardTab(prev => !prev)}
            coins={activeCoins}
            shoeLevel={activeShoeLevel}
            onUpgradeShoes={handleUpgradeShoes}
          />

          {/* Long Fall dramatic quote banner */}
          {fallQuote && (
            <div className="absolute bottom-60 left-1/2 -translate-x-1/2 bg-red-950/95 border border-red-500/40 text-red-200 px-6 py-3.5 rounded-2xl shadow-2xl text-xs md:text-sm font-black uppercase text-center select-none backdrop-blur-md animate-bounce max-w-md w-11/12 border-dashed z-40 tracking-wide">
              ⚠️ {fallQuote}
            </div>
          )}

          {/* Goal Finish Splash Overlay */}
          {hasFinished && (
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-emerald-500/30 backdrop-blur-md px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-3.5 text-center pointer-events-auto max-w-md w-11/12 sm:w-[420px] animate-slide-in">
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full tracking-widest uppercase border border-emerald-500/20">Thành công</span>
              <h3 className="text-2xl font-black text-white tracking-wide">BẠN ĐÃ CÁN ĐÍCH!</h3>
              <p className="text-sm text-slate-350 leading-relaxed px-2">
                Chúc mừng bạn đã chinh phục đỉnh núi với thời gian: <span className="font-mono font-bold text-amber-400 whitespace-nowrap">{Math.round(finishTime)} giây</span>.
              </p>
              
              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-4 py-2.5 rounded-2xl text-yellow-400 font-extrabold text-sm my-1 animate-pulse">
                <Coins size={16} className="text-yellow-400 animate-pulse" />
                <span>Tổng số xu đã thu thập: {activeCoins} xu</span>
              </div>
              
              <span className="text-[10px] text-slate-500 italic mt-1">Bạn có thể tiếp tục xem người khác leo hoặc rời phòng.</span>
            </div>
          )}

          {/* Host Admin Controls Panel */}
          {isHost && (
            <HostControls
              roomId={roomId}
              roomConfig={roomConfig}
              players={players}
              spectatedPlayerId={spectatedPlayerId}
              onStartGame={handleStartGame}
              onStopGame={handleStopGame}
              onEndGame={handleEndGame}
              onSpectatePlayer={handleSpectatePlayer}
              copiedId={copiedId}
              onCopyRoomId={handleCopyRoomId}
            />
          )}

          {/* Mobile Joystick Controller UI */}
          {!isHost && (
            <MobileControls
              onRespawnClick={handleRespawn}
            />
          )}

          {/* Checkpoint Quiz Popup Modal */}
          <QuizPopup
            isOpen={checkpointQuizOpen}
            question={roomConfig.quizData[quizCheckpointId] || null}
            checkpointId={quizCheckpointId}
            onSaveSuccess={handleSaveCheckpointSuccess}
            onClose={() => setCheckpointQuizOpen(false)}
          />

          {/* Leaderboard Overlay when holding TAB */}
          <Leaderboard
            players={players}
            isOpen={showLeaderboardTab}
            onClose={() => setShowLeaderboardTab(false)}
            localPlayerId={playerId}
          />

          {/* Resume Countdown Overlay */}
          {resumeCountdown !== null && resumeCountdown > 0 && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none select-none animate-fade-in">
              <div className="text-center space-y-2">
                <span className="text-xs font-black tracking-widest text-indigo-400 uppercase">Chuẩn bị tiếp tục trong</span>
                <div key={resumeCountdown} className="text-8xl md:text-9xl font-black text-white drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] animate-bounce">
                  {resumeCountdown}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 6. GAME OVER / FINAL SCREEN */}
      {screen === 'ended' && roomConfig && (
        <Leaderboard
          players={players}
          isOpen={true}
          isGameOver={true}
          isHost={isHost}
          onRestartGame={handleRestartGame}
          gameDuration={roomConfig.duration}
        />
      )}

      {/* --- FIREBASE SETTINGS MODAL --- */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in pointer-events-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Database size={18} className="text-indigo-400" />
                <span>Cấu hình database Firebase</span>
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Dán đoạn cấu hình Firebase Web App Config dưới dạng JSON. Nếu bỏ trống, game sẽ mặc định chạy trên kênh BroadcastChannel nội bộ của trình duyệt (cho phép nhiều tab chơi chung trên một máy tính).
            </p>

            <textarea
              placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "...",\n  "databaseURL": "...",\n  "projectId": "...",\n  "storageBucket": "...",\n  "messagingSenderId": "...",\n  "appId": "..."\n}`}
              value={firebaseConfigInput}
              onChange={(e) => setFirebaseConfigInput(e.target.value)}
              rows={8}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveFirebaseSettings}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/10 transition"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
