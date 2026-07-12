import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  set, 
  update, 
  onValue, 
  off, 
  get, 
  remove,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  onDisconnect,
  serverTimestamp
} from 'firebase/database';
import { PlayerState, RoomConfig } from './types';

// Check if environment variables are configured in the .env file
const getEnvFirebaseConfig = () => {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL;
  
  if (apiKey && apiKey !== "YOUR_API_KEY_HERE" && databaseURL && !databaseURL.includes("YOUR_PROJECT_ID")) {
    return {
      apiKey: apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      databaseURL: databaseURL,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
  }
  return null;
};

class SyncService {
  private mode: 'firebase' | 'local' = 'local';
  private db: any = null;
  private channel: BroadcastChannel | null = null;
  private localRoomConfig: RoomConfig | null = null;
  private localPlayers: Record<string, PlayerState> = {};
  private roomCallbacks: Set<(config: RoomConfig | null) => void> = new Set();
  private playersCallbacks: Set<(players: Record<string, PlayerState>) => void> = new Set();
  private roomId: string | null = null;
  private playerId: string | null = null;

  constructor() {
    this.tryInitFirebase();
  }

  // Load custom firebase config or use default
  public tryInitFirebase(customConfig?: any) {
    const envConfig = getEnvFirebaseConfig();
    const config = customConfig || this.getSavedFirebaseConfig() || envConfig;
    
    // Check if configuration looks like it could be valid or we should try to initialize
    if (config && config.databaseURL && !config.databaseURL.includes("DummyKey")) {
      try {
        let app;
        if (getApps().length === 0) {
          app = initializeApp(config);
        } else {
          app = getApp();
        }
        this.db = getDatabase(app);
        this.mode = 'firebase';
        console.log("SyncService: Firebase database initialized successfully.");
      } catch (err) {
        console.error("SyncService: Firebase initialization failed. Falling back to local mode.", err);
        this.mode = 'local';
        this.db = null;
      }
    } else {
      console.log("SyncService: No valid custom Firebase config found. Running in Local Mode (BroadcastChannel).");
      this.mode = 'local';
      this.db = null;
    }
  }

  public getMode(): 'firebase' | 'local' {
    return this.mode;
  }

  public saveFirebaseConfig(config: any) {
    localStorage.setItem('firebase_config', JSON.stringify(config));
    this.tryInitFirebase(config);
  }

  public getSavedFirebaseConfig(): any | null {
    const saved = localStorage.getItem('firebase_config');
    return saved ? JSON.parse(saved) : null;
  }

  public clearSavedFirebaseConfig() {
    localStorage.removeItem('firebase_config');
    this.mode = 'local';
    this.db = null;
  }

  // Setup BroadcastChannel for Local Mode
  private initLocalChannel(roomId: string, currentPlayerId?: string) {
    this.roomId = roomId;
    if (currentPlayerId) this.playerId = currentPlayerId;

    if (this.channel) {
      this.channel.close();
    }

    this.channel = new BroadcastChannel(`jump-quiz-room-${roomId}`);
    
    this.channel.onmessage = (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      switch (msg.type) {
        case 'query_state':
          // Another tab is asking for the current room state. If we have the config, send it.
          if (this.localRoomConfig) {
            this.sendToChannel({
              type: 'respond_state',
              roomConfig: this.localRoomConfig,
              players: this.localPlayers
            });
          }
          break;

        case 'respond_state':
          if (msg.roomConfig) {
            this.localRoomConfig = msg.roomConfig;
            this.notifyRoomCallbacks();
          }
          if (msg.players) {
            this.localPlayers = { ...this.localPlayers, ...msg.players };
            this.notifyPlayersCallbacks();
          }
          break;

        case 'room_update':
          if (this.localRoomConfig) {
            this.localRoomConfig = { ...this.localRoomConfig, ...msg.updates };
          } else {
            this.localRoomConfig = msg.updates;
          }
          this.notifyRoomCallbacks();
          break;

        case 'player_update':
          const pid = msg.playerId;
          const current = this.localPlayers[pid] || {};
          this.localPlayers[pid] = { ...current, ...msg.updates } as PlayerState;
          this.notifyPlayersCallbacks();
          break;

        case 'player_leave':
          delete this.localPlayers[msg.playerId];
          this.notifyPlayersCallbacks();
          break;
      }
    };

    // Ask other tabs for state immediately when we join
    this.sendToChannel({ type: 'query_state', requesterId: this.playerId });
  }

  private sendToChannel(msg: any) {
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch (err) {
        console.error("BroadcastChannel postMessage error:", err);
      }
    }
  }

  private notifyRoomCallbacks() {
    this.roomCallbacks.forEach(cb => cb(this.localRoomConfig));
  }

  private notifyPlayersCallbacks() {
    this.playersCallbacks.forEach(cb => cb(this.localPlayers));
  }

  // --- PUBLIC API ---

  public async checkHostStatus(roomId: string, hostName: string): Promise<'active' | 'offline' | 'none'> {
    if (this.mode === 'firebase' && this.db) {
      try {
        const roomRef = ref(this.db, `rooms/${roomId}`);
        const snapshot = await get(roomRef);
        if (!snapshot.exists()) return 'none';
        
        const data = snapshot.val();
        const playersData = data.players || {};
        const host = Object.values(playersData).find((p: any) => p.isHost) as any;
        
        if (host) {
          if (host.name === hostName) {
            return host.offline ? 'offline' : 'active';
          }
          return host.offline ? 'none' : 'active';
        }
        return 'none';
      } catch (err) {
        console.error("checkHostStatus error:", err);
        return 'none';
      }
    }
    
    // Local Mode fallback
    if (this.localRoomConfig) {
      const host = Object.values(this.localPlayers).find(p => p.isHost);
      if (host) return 'active';
    }
    return 'none';
  }

  public async checkPlayerStatus(roomId: string, name: string): Promise<{ status: 'active' | 'offline' | 'none'; player?: PlayerState }> {
    if (this.mode === 'firebase' && this.db) {
      try {
        const playersRef = ref(this.db, `rooms/${roomId}/players`);
        const snapshot = await get(playersRef);
        if (!snapshot.exists()) return { status: 'none' };
        
        const playersData = snapshot.val();
        const foundPlayer = Object.values(playersData).find((p: any) => !p.isHost && p.name === name) as PlayerState | undefined;
        
        if (foundPlayer) {
          return {
            status: foundPlayer.offline ? 'offline' : 'active',
            player: foundPlayer
          };
        }
        return { status: 'none' };
      } catch (err) {
        console.error("checkPlayerStatus error:", err);
        return { status: 'none' };
      }
    }
    
    // Local Mode fallback
    const foundPlayer = Object.values(this.localPlayers).find(p => !p.isHost && p.name === name);
    if (foundPlayer) {
      return { status: 'active', player: foundPlayer };
    }
    return { status: 'none' };
  }

  public async getPlayerByName(roomId: string, name: string): Promise<PlayerState | null> {
    if (this.mode === 'firebase' && this.db) {
      try {
        const playersRef = ref(this.db, `rooms/${roomId}/players`);
        const snapshot = await get(playersRef);
        if (!snapshot.exists()) return null;
        
        const playersData = snapshot.val();
        const found = Object.values(playersData).find((p: any) => p.name === name) as PlayerState | undefined;
        return found || null;
      } catch (err) {
        console.error("getPlayerByName error:", err);
        return null;
      }
    }
    
    // Local Mode fallback
    const found = Object.values(this.localPlayers).find(p => p.name === name);
    return found || null;
  }

  public async getRoomConfig(roomId: string): Promise<RoomConfig | null> {
    if (this.mode === 'firebase' && this.db) {
      try {
        const configRef = ref(this.db, `rooms/${roomId}/config`);
        const snapshot = await get(configRef);
        return snapshot.exists() ? snapshot.val() as RoomConfig : null;
      } catch (err) {
        console.error("getRoomConfig error:", err);
        return null;
      }
    }
    return this.localRoomConfig;
  }

  public async createRoom(roomId: string, hostPlayer: PlayerState, config: RoomConfig): Promise<void> {
    this.roomId = roomId;
    this.playerId = hostPlayer.id;

    if (this.mode === 'firebase' && this.db) {
      try {
        const roomRef = ref(this.db, `rooms/${roomId}`);
        await set(roomRef, {
          config,
          players: {
            [hostPlayer.id]: hostPlayer
          }
        });
        
        // Register host disconnect marker
        const hostPlayerRef = ref(this.db, `rooms/${roomId}/players/${hostPlayer.id}`);
        onDisconnect(hostPlayerRef).update({ offline: true });
        return;
      } catch (err) {
        console.error("Firebase createRoom error, falling back to local:", err);
        this.mode = 'local';
      }
    }

    // Local fallback
    this.localRoomConfig = config;
    this.localPlayers = { [hostPlayer.id]: hostPlayer };
    this.initLocalChannel(roomId, hostPlayer.id);
    this.notifyRoomCallbacks();
    this.notifyPlayersCallbacks();
  }

  public async joinRoom(roomId: string, player: PlayerState): Promise<void> {
    this.roomId = roomId;
    this.playerId = player.id;

    if (this.mode === 'firebase' && this.db) {
      try {
        const playerRef = ref(this.db, `rooms/${roomId}/players/${player.id}`);
        await set(playerRef, player);
        
        // Register player disconnect marker
        onDisconnect(playerRef).update({ offline: true });
        return;
      } catch (err) {
        console.error("Firebase joinRoom error, falling back to local:", err);
        this.mode = 'local';
      }
    }

    // Local fallback
    this.initLocalChannel(roomId, player.id);
    this.localPlayers[player.id] = player;
    this.sendToChannel({
      type: 'player_update',
      playerId: player.id,
      updates: player
    });
    this.notifyPlayersCallbacks();
  }

  public async updatePlayer(roomId: string, playerId: string, updates: Partial<PlayerState>): Promise<void> {
    // Inject lastActive to keep track of active players
    const fullUpdates = { ...updates, lastActive: Date.now() };

    if (this.mode === 'firebase' && this.db) {
      try {
        const playerRef = ref(this.db, `rooms/${roomId}/players/${playerId}`);
        await update(playerRef, fullUpdates);
        
        // If re-establishing connection (offline = false), reset onDisconnect handler
        if (updates.offline === false) {
          onDisconnect(playerRef).update({ offline: true });
        }
        return;
      } catch (err) {
        console.error("Firebase updatePlayer error:", err);
      }
    }

    // Local update
    const current = this.localPlayers[playerId] || {};
    this.localPlayers[playerId] = { ...current, ...fullUpdates } as PlayerState;
    this.sendToChannel({
      type: 'player_update',
      playerId,
      updates: fullUpdates
    });
    this.notifyPlayersCallbacks();
  }

  public async updateRoom(roomId: string, updates: Partial<RoomConfig>): Promise<void> {
    if (this.mode === 'firebase' && this.db) {
      try {
        const configRef = ref(this.db, `rooms/${roomId}/config`);
        await update(configRef, updates);
        return;
      } catch (err) {
        console.error("Firebase updateRoom error:", err);
      }
    }

    // Local update
    if (this.localRoomConfig) {
      this.localRoomConfig = { ...this.localRoomConfig, ...updates };
    } else {
      this.localRoomConfig = updates as RoomConfig;
    }
    this.sendToChannel({
      type: 'room_update',
      updates
    });
    this.notifyRoomCallbacks();
  }

  public onRoomUpdate(roomId: string, callback: (config: RoomConfig | null) => void): () => void {
    this.roomCallbacks.add(callback);

    if (this.mode === 'firebase' && this.db) {
      const configRef = ref(this.db, `rooms/${roomId}/config`);
      const listener = onValue(configRef, (snapshot) => {
        const data = snapshot.val();
        callback(data);
      });
      return () => {
        off(configRef, 'value', listener);
        this.roomCallbacks.delete(callback);
      };
    }

    // Local mode - set up BroadcastChannel if not done yet
    if (!this.channel || this.roomId !== roomId) {
      this.initLocalChannel(roomId);
    }
    callback(this.localRoomConfig);
    return () => {
      this.roomCallbacks.delete(callback);
    };
  }

  public onPlayersUpdate(roomId: string, callback: (players: Record<string, PlayerState>) => void): () => void {
    this.playersCallbacks.add(callback);

    if (this.mode === 'firebase' && this.db) {
      const playersRef = ref(this.db, `rooms/${roomId}/players`);
      const playersCache: Record<string, PlayerState> = {};

      // Register optimized child database listeners
      const unsubAdded = onChildAdded(playersRef, (snapshot) => {
        const pid = snapshot.key;
        if (pid) {
          playersCache[pid] = snapshot.val() as PlayerState;
          callback({ ...playersCache });
        }
      });

      const unsubChanged = onChildChanged(playersRef, (snapshot) => {
        const pid = snapshot.key;
        if (pid) {
          playersCache[pid] = snapshot.val() as PlayerState;
          callback({ ...playersCache });
        }
      });

      const unsubRemoved = onChildRemoved(playersRef, (snapshot) => {
        const pid = snapshot.key;
        if (pid) {
          delete playersCache[pid];
          callback({ ...playersCache });
        }
      });

      return () => {
        unsubAdded();
        unsubChanged();
        unsubRemoved();
        this.playersCallbacks.delete(callback);
      };
    }

    // Local mode
    if (!this.channel || this.roomId !== roomId) {
      this.initLocalChannel(roomId);
    }
    callback(this.localPlayers);
    return () => {
      this.playersCallbacks.delete(callback);
    };
  }

  public async leaveRoom(roomId: string, playerId: string): Promise<void> {
    if (this.mode === 'firebase' && this.db) {
      try {
        const playerRef = ref(this.db, `rooms/${roomId}/players/${playerId}`);
        await remove(playerRef);
        return;
      } catch (err) {
        console.error("Firebase leaveRoom error:", err);
      }
    }

    // Local mode
    delete this.localPlayers[playerId];
    this.sendToChannel({
      type: 'player_leave',
      playerId
    });
    this.notifyPlayersCallbacks();
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.roomId = null;
    this.playerId = null;
  }

  public async deleteRoom(roomId: string): Promise<void> {
    if (this.mode === 'firebase' && this.db) {
      try {
        const roomRef = ref(this.db, `rooms/${roomId}`);
        await remove(roomRef);
        return;
      } catch (err) {
        console.error("Firebase deleteRoom error:", err);
      }
    }

    // Local mode
    this.localRoomConfig = null;
    this.localPlayers = {};
    this.notifyRoomCallbacks();
    this.notifyPlayersCallbacks();
  }
}

export const syncService = new SyncService();
