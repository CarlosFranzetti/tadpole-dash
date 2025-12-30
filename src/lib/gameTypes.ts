export interface Position {
  x: number;
  y: number;
}

export interface GameObject extends Position {
  width: number;
  height: number;
  speed: number;
  direction: 1 | -1;
  type: string;
  isDiving?: boolean;
  diveTimer?: number;
  divePhase?: 'surface' | 'diving' | 'submerged' | 'rising';
  colorVariant?: number;
}

export interface PowerUp {
  x: number;
  y: number;
  type: 'extraLife' | 'invincibility';
  collected: boolean;
}

export interface Lane {
  y: number;
  objects: GameObject[];
  type: 'road' | 'water' | 'safe' | 'home';
  speed: number;
  direction: 1 | -1;
  objectType: string;
}

export interface Player extends Position {
  lives: number;
  score: number;
  isMoving: boolean;
  targetX: number;
  targetY: number;
}

export interface HomeSpot {
  x: number;
  filled: boolean;
}

export interface HighScore {
  initials: string;
  score: number;
  date: string;
}

export type GameState = 'title' | 'playing' | 'gameover' | 'highscores' | 'entering-initials';

export type SwipeDirection = 'up' | 'down' | 'left' | 'right' | null;
