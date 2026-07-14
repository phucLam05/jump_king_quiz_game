export interface Question {
  question: string;
  answers: string[];
  correct: number;
}

export interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  height: number;
  checkpointId: number; // -1 if none
  isFinished: boolean;
  finishTime: number; // elapsed seconds or timestamp when finished
  color: string;
  isHost: boolean;
  lastActive: number;
  offline?: boolean;
  teleportTarget?: { x: number; y: number; time: number } | null;
  coins: number;
  isFlying?: boolean;
  shoeLevel?: number;
}

export interface RoomConfig {
  status: 'waiting' | 'playing' | 'paused' | 'ended';
  duration: number; // in seconds
  startTime: number; // unix timestamp (ms) or 0
  mapId: string;
  quizData: Question[];
  hostId: string;
}

export interface CheckpointConfig {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlatformConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  isCollapsing?: boolean;
  isSlippery?: boolean;
  isBooster?: boolean;
}

export interface MovingPlatformConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  startX?: number;
  endX?: number;
  startY?: number;
  endY?: number;
  speed: number;
}

export interface MonsterConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  startX: number;
  endX: number;
  speed: number;
  knockbackForce?: number;
}

export interface MapConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  spawnX: number;
  spawnY: number;
  platforms: PlatformConfig[];
  movingPlatforms?: MovingPlatformConfig[];
  monsters?: MonsterConfig[];
  checkpoints: CheckpointConfig[];
  goal: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  backgroundColor: string;
}
