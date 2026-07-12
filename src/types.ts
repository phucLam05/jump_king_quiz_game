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
}

export interface MapConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  spawnX: number;
  spawnY: number;
  platforms: PlatformConfig[];
  checkpoints: CheckpointConfig[];
  goal: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  backgroundColor: string;
}
