export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 640;
export const TILE_SIZE = 40;
export const PLAYER_SIZE = 36;

export const LANES_CONFIG = [
  // Home spots row
  { type: 'home' as const, y: 0 },
  // Water lanes (5 lanes)
  { type: 'water' as const, y: 1, speed: 1.5, direction: -1 as const, objectType: 'log-long' },
  { type: 'water' as const, y: 2, speed: 2, direction: 1 as const, objectType: 'turtle' },
  { type: 'water' as const, y: 3, speed: 1.2, direction: -1 as const, objectType: 'log-short' },
  { type: 'water' as const, y: 4, speed: 2.5, direction: 1 as const, objectType: 'turtle' },
  { type: 'water' as const, y: 5, speed: 1.8, direction: -1 as const, objectType: 'log-medium' },
  // Safe zone
  { type: 'safe' as const, y: 6 },
  // Road lanes (5 lanes)
  { type: 'road' as const, y: 7, speed: 2, direction: 1 as const, objectType: 'car' },
  { type: 'road' as const, y: 8, speed: 3, direction: -1 as const, objectType: 'truck' },
  { type: 'road' as const, y: 9, speed: 1.5, direction: 1 as const, objectType: 'car' },
  { type: 'road' as const, y: 10, speed: 2.5, direction: -1 as const, objectType: 'truck' },
  { type: 'road' as const, y: 11, speed: 2, direction: 1 as const, objectType: 'car' },
  // Starting safe zone
  { type: 'safe' as const, y: 12 },
];

export const HOME_SPOTS = [
  { x: 20, filled: false },
  { x: 90, filled: false },
  { x: 160, filled: false },
  { x: 230, filled: false },
  { x: 300, filled: false },
];

export const OBJECT_WIDTHS: Record<string, number> = {
  'car': 50,
  'truck': 80,
  'log-short': 80,
  'log-medium': 120,
  'log-long': 160,
  'turtle': 100,
};

export const POINTS = {
  MOVE_FORWARD: 10,
  REACH_HOME: 50,
  ALL_HOMES_FILLED: 1000,
  LEVEL_COMPLETE: 500,
};

export const COLORS = {
  water: '#1e3a5f',
  road: '#2d2d2d',
  grass: '#2d5a27',
  home: '#1a4d1a',
  player: '#7cb342',
  car1: '#e53935',
  car2: '#1e88e5',
  truck: '#ff9800',
  log: '#8d6e63',
  turtle: '#4caf50',
  lilypad: '#66bb6a',
};
