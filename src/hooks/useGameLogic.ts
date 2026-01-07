import { useState, useCallback, useRef, useEffect } from 'react';
import { Player, Lane, GameObject, HomeSpot, SwipeDirection, PowerUp, DeathEffect } from '@/lib/gameTypes';
import { 
  GAME_WIDTH, 
  TILE_SIZE, 
  LANES_CONFIG, 
  HOME_SPOTS, 
  OBJECT_WIDTHS,
  POINTS,
  PLAYER_SIZE
} from '@/lib/gameConstants';
import { useSoundEffects } from './useSoundEffects';

const STARTING_X = GAME_WIDTH / 2 - PLAYER_SIZE / 2;

// Derive rows from the lane config so adding rows stays consistent everywhere.
const START_ROW = Math.max(...LANES_CONFIG.map(c => c.y));
const MID_SAFE_ROW = LANES_CONFIG.find(c => c.type === 'safe' && c.y !== START_ROW)?.y ?? START_ROW;
const STARTING_Y = START_ROW * TILE_SIZE + 2;

// Turtle dive phases with durations
// Note: surfaced + submerged pauses are intentionally longer (+18%) for readability.
const DIVE_PHASES = {
  surface: { duration: 4720, next: 'diving' as const },
  diving: { duration: 800, next: 'submerged' as const },
  submerged: { duration: 2360, next: 'rising' as const },
  rising: { duration: 800, next: 'surface' as const },
};

const LEVEL1_TURTLE_SUBMERGE_GRACE_MS = 200;

const clampTile = (t: number) => Math.max(0, Math.min(Math.floor(GAME_WIDTH / TILE_SIZE) - 1, t));

const getTileRange = (leftPx: number, rightPx: number) => {
  // rightPx is exclusive-ish; subtract a tiny epsilon so exact edge aligns to the previous tile.
  const start = clampTile(Math.floor(leftPx / TILE_SIZE));
  const end = clampTile(Math.floor((rightPx - 0.0001) / TILE_SIZE));
  return { start, end };
};

const rangesOverlap = (a: { start: number; end: number }, b: { start: number; end: number }) => a.start <= b.end && b.start <= a.end;

const isTurtleSafeToStandOn = (obj: GameObject, level: number) => {
  const phase = obj.divePhase || 'surface';
  if (phase !== 'submerged') return true;

  // Submerged turtles are water. On level 1, allow a small grace window at start/end of the submerged phase.
  if (level !== 1) return false;

  const remaining = obj.diveTimer ?? 0;
  const dur = DIVE_PHASES.submerged.duration;
  return remaining >= dur - LEVEL1_TURTLE_SUBMERGE_GRACE_MS || remaining <= LEVEL1_TURTLE_SUBMERGE_GRACE_MS;
};

const getWaterSupport = (player: Player, lane: Lane, level: number) => {
  // Proper water collision: frog must be ON a platform to survive.
  // Use center-point collision for accurate gap detection.
  const frogCenterX = player.x + PLAYER_SIZE / 2;

  for (const obj of lane.objects) {
    const platformLeft = obj.x + 2;  // Small inset for visual accuracy
    const platformRight = obj.x + obj.width - 2;
    
    // Check if frog center is over this platform
    if (frogCenterX >= platformLeft && frogCenterX <= platformRight) {
      // For turtles, check if they're submerged
      if (obj.type === 'turtle' && !isTurtleSafeToStandOn(obj, level)) {
        // Turtle is submerged - this counts as water, frog dies
        return { supported: false, carrySpeed: 0, carryDir: 0 };
      }

      return {
        supported: true,
        carrySpeed: obj.speed,
        carryDir: obj.direction,
      };
    }
  }

  // Frog is in a gap between platforms - dies
  return { supported: false, carrySpeed: 0, carryDir: 0 };
};

const getRandomVehicleType = (level: number, laneIndex: number, objectIndex: number): string => {
  const seed = laneIndex * 7 + level * 13 + objectIndex * 11;

  if (level <= 2) {
    const types = ['car-small', 'car-small', 'car', 'car-wide', 'motorcycle'];
    return types[seed % types.length];
  } else {
    const types = ['car-small', 'car', 'car-wide', 'truck', 'truck-long', 'motorcycle', 'motorcycle'];
    return types[seed % types.length];
  }
};

// Speed variation per vehicle type
const getVehicleSpeedMultiplier = (vehicleType: string): number => {
  switch (vehicleType) {
    case 'motorcycle': return 1.6 + Math.random() * 0.4; // 1.6-2.0x
    case 'car-small': return 1.1 + Math.random() * 0.3;  // 1.1-1.4x
    case 'car': return 0.9 + Math.random() * 0.3;        // 0.9-1.2x
    case 'car-wide': return 0.7 + Math.random() * 0.2;   // 0.7-0.9x
    case 'truck': return 0.6 + Math.random() * 0.2;      // 0.6-0.8x
    case 'truck-long': return 0.5 + Math.random() * 0.15; // 0.5-0.65x
    default: return 1;
  }
};

const LOG_TYPES = ['log-short', 'log-medium', 'log-long'] as const;
const pickLogType = () => LOG_TYPES[Math.floor(Math.random() * LOG_TYPES.length)];

const createLaneObjects = (laneConfig: typeof LANES_CONFIG[number], level: number): GameObject[] => {
  if (laneConfig.type === 'safe' || laneConfig.type === 'home' || !laneConfig.objectType) {
    return [];
  }

  const isRoad = laneConfig.type === 'road';
  const isWater = laneConfig.type === 'water';

  // Road lanes: enforce big openings on level 1.
  // Vehicles spawn from the correct side based on direction
  if (isRoad) {
    const objects: GameObject[] = [];

    const baseSpacing = level === 1 ? 420 : 300;
    const spacingReduction = Math.min((level - 1) * 30, 110);

    const maxVehicleWidth = level <= 2 ? 80 : 120;
    const minRoadGap = level === 1 ? TILE_SIZE * 2 : TILE_SIZE; // 2 tiles on L1
    const minRoadSpacing = maxVehicleWidth + minRoadGap;

    const spacing = Math.max(baseSpacing - spacingReduction, minRoadSpacing);
    const numObjects = Math.ceil((GAME_WIDTH + spacing * 2) / spacing);
    const levelSpeedMultiplier = 1 + (level - 1) * 0.15;

    const dir = laneConfig.direction || 1;

    // Pre-generate all vehicle types and widths to calculate proper positions
    const vehicleData: { type: string; width: number; speedMult: number }[] = [];
    for (let i = 0; i < numObjects; i++) {
      const objectType = getRandomVehicleType(level, laneConfig.y, i);
      const objectWidth = OBJECT_WIDTHS[objectType] || 60;
      const vehicleSpeedMult = getVehicleSpeedMultiplier(objectType);
      vehicleData.push({ type: objectType, width: objectWidth, speedMult: vehicleSpeedMult });
    }

    // Calculate spawn positions ensuring ALL vehicles start OFF-SCREEN
    // and don't overlap (except motorcycles can be closer)
    let currentOffset = 0;
    
    for (let i = 0; i < numObjects; i++) {
      const { type: objectType, width: objectWidth, speedMult: vehicleSpeedMult } = vehicleData[i];
      
      // Gap between this vehicle and the next - motorcycles can be closer
      const isMotorcycle = objectType === 'motorcycle';
      const nextIsMotorcycle = i + 1 < numObjects && vehicleData[i + 1].type === 'motorcycle';
      const gapMultiplier = (isMotorcycle || nextIsMotorcycle) ? 0.6 : 1;
      const gap = spacing * gapMultiplier;

      let spawnX: number;
      if (dir === 1) {
        // Moving right: spawn off LEFT edge (all x values negative)
        spawnX = -objectWidth - currentOffset;
      } else {
        // Moving left: spawn off RIGHT edge (all x values >= GAME_WIDTH)
        spawnX = GAME_WIDTH + currentOffset;
      }

      objects.push({
        x: spawnX,
        y: laneConfig.y * TILE_SIZE,
        width: objectWidth,
        height: TILE_SIZE - 4,
        speed: (laneConfig.speed || 1) * levelSpeedMultiplier * vehicleSpeedMult,
        direction: dir,
        type: objectType,
        isDiving: false,
        divePhase: undefined,
        diveTimer: undefined,
        colorVariant: Math.floor(Math.random() * 4),
      });

      currentOffset += objectWidth + gap;
    }

    return objects;
  }

  // Water lanes: never overlap, and logs vary length randomly.
  if (isWater) {
    const objects: GameObject[] = [];

    const gap = level === 1 ? TILE_SIZE : Math.round(TILE_SIZE * 0.8);
    const buffer = GAME_WIDTH + 240;

    // Randomize phase so lanes don't look identical.
    let x = -buffer + Math.random() * (gap * 2);
    const speedMultiplier = 1 + (level - 1) * 0.12;

    while (x < GAME_WIDTH + buffer) {
      const isTurtle = laneConfig.objectType === 'turtle';
      const objectType = isTurtle ? 'turtle' : pickLogType();
      const objectWidth = OBJECT_WIDTHS[objectType] || 100;

      objects.push({
        x,
        y: laneConfig.y * TILE_SIZE,
        width: objectWidth,
        height: TILE_SIZE,  // Full tile height for logs/turtles
        speed: (laneConfig.speed || 1) * speedMultiplier,
        direction: laneConfig.direction || 1,
        type: objectType,
        isDiving: false,
        divePhase: isTurtle ? 'surface' : undefined,
        // Start offset so turtle groups don't sync
        diveTimer: isTurtle
          ? DIVE_PHASES.surface.duration * 0.4 + Math.random() * DIVE_PHASES.surface.duration * 0.6
          : undefined,
        colorVariant: Math.floor(Math.random() * 4),
      });

      x += objectWidth + gap;
    }

    return objects;
  }

  return [];
};

const createPowerUp = (): PowerUp | null => {
  if (Math.random() > 0.3) return null; // 30% chance to spawn

  const safeZoneY = MID_SAFE_ROW * TILE_SIZE;
  const type = Math.random() > 0.7 ? 'extraLife' : 'invincibility';

  return {
    x: Math.random() * (GAME_WIDTH - 30) + 15,
    y: safeZoneY + 5,
    type,
    collected: false,
  };
};

export const useGameLogic = () => {
  const { playSound } = useSoundEffects();
  const [level, setLevel] = useState(1);
  const [continuesUsed, setContinuesUsed] = useState(0);
  const MAX_CONTINUES = 3;
  const [player, setPlayer] = useState<Player>({
    x: STARTING_X,
    y: STARTING_Y,
    lives: 3,
    score: 0,
    isMoving: false,
    targetX: STARTING_X,
    targetY: STARTING_Y,
  });
  const playerRef = useRef<Player>({
    x: STARTING_X,
    y: STARTING_Y,
    lives: 3,
    score: 0,
    isMoving: false,
    targetX: STARTING_X,
    targetY: STARTING_Y,
  });

  const [lanes, setLanes] = useState<Lane[]>([]);
  const lanesRef = useRef<Lane[]>([]);

  const [homeSpots, setHomeSpots] = useState<HomeSpot[]>(HOME_SPOTS.map(h => ({ ...h })));
  const [isGameOver, setIsGameOver] = useState(false);
  const [highestRow, setHighestRow] = useState(START_ROW);
  const [powerUp, setPowerUp] = useState<PowerUp | null>(null);
  const [isInvincible, setIsInvincible] = useState(false);
  const [deathEffect, setDeathEffect] = useState<DeathEffect | null>(null);
  const invincibleTimerRef = useRef<number | null>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    lanesRef.current = lanes;
  }, [lanes]);

  const initializeLanes = useCallback((currentLevel: number) => {
    const newLanes: Lane[] = LANES_CONFIG.map(config => ({
      y: config.y * TILE_SIZE,
      objects: createLaneObjects(config, currentLevel),
      type: config.type,
      speed: config.speed || 0,
      direction: config.direction || 1,
      objectType: config.objectType || '',
    }));
    setLanes(newLanes);
    setPowerUp(createPowerUp());
  }, []);

  const resetPlayer = useCallback(() => {
    setPlayer(prev => ({
      ...prev,
      x: STARTING_X,
      y: STARTING_Y,
      targetX: STARTING_X,
      targetY: STARTING_Y,
      isMoving: false,
    }));
    setHighestRow(START_ROW);
  }, []);
  const startGame = useCallback(() => {
    setLevel(1);
    setContinuesUsed(0);
    setPlayer({
      x: STARTING_X,
      y: STARTING_Y,
      lives: 3,
      score: 0,
      isMoving: false,
      targetX: STARTING_X,
      targetY: STARTING_Y,
    });
    setHomeSpots(HOME_SPOTS.map(h => ({ ...h })));
    setHighestRow(START_ROW);
    setIsGameOver(false);
    setIsInvincible(false);
    if (invincibleTimerRef.current) {
      clearTimeout(invincibleTimerRef.current);
    }
    initializeLanes(1);
  }, [initializeLanes]);

  const continueGame = useCallback(() => {
    if (continuesUsed >= MAX_CONTINUES) return;
    
    setContinuesUsed(prev => prev + 1);
    setPlayer(prev => ({
      ...prev,
      x: STARTING_X,
      y: STARTING_Y,
      lives: 3,
      targetX: STARTING_X,
      targetY: STARTING_Y,
      isMoving: false,
    }));
    setHighestRow(START_ROW);
    setIsGameOver(false);
    setIsInvincible(false);
  }, [continuesUsed]);

  const createDeathParticles = useCallback((x: number, y: number, type: 'splash' | 'crash') => {
    const particles = [];
    const count = type === 'splash' ? 16 : 12;
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 1.5 + Math.random() * 2.5;
      
      if (type === 'splash') {
        // Blue water particles - more varied
        particles.push({
          x: x + PLAYER_SIZE / 2 + (Math.random() - 0.5) * 8,
          y: y + PLAYER_SIZE / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3, // Strong upward bias
          size: 2 + Math.random() * 4,
          color: ['#4fc3f7', '#29b6f6', '#03a9f4', '#81d4fa', '#b3e5fc'][Math.floor(Math.random() * 5)],
        });
      } else {
        // Red blood/splat particles - more spread
        particles.push({
          x: x + PLAYER_SIZE / 2 + (Math.random() - 0.5) * 10,
          y: y + PLAYER_SIZE / 2,
          vx: Math.cos(angle) * speed * 1.2,
          vy: Math.sin(angle) * speed * 0.6,
          size: 2 + Math.random() * 5,
          color: ['#c62828', '#d32f2f', '#e53935', '#b71c1c', '#ff5252'][Math.floor(Math.random() * 5)],
        });
      }
    }
    
    return particles;
  }, []);

  const isDyingRef = useRef(false);

  const handleDeath = useCallback((type: 'splash' | 'crash') => {
    if (isInvincible || isDyingRef.current) return; // Prevent double death
    
    isDyingRef.current = true;
    playSound(type);
    
    // Create death effect at current position
    const deathX = playerRef.current.x;
    const deathY = playerRef.current.y;
    
    setDeathEffect({
      x: deathX,
      y: deathY,
      type,
      frame: 0,
      particles: createDeathParticles(deathX, deathY, type),
    });
    
    // Hide the player immediately by moving off screen during death animation
    setPlayer(prev => ({
      ...prev,
      x: -100,
      y: -100,
      targetX: -100,
      targetY: -100,
      isMoving: false,
    }));
    
    // Pause for 1 second to show animation, then respawn or game over
    setTimeout(() => {
      setDeathEffect(null);
      isDyingRef.current = false;
      
      setPlayer(prev => {
        const newLives = prev.lives - 1;
        if (newLives <= 0) {
          setIsGameOver(true);
          playSound('gameover');
          return { ...prev, lives: 0 };
        }
        return {
          ...prev,
          lives: newLives,
          x: STARTING_X,
          y: STARTING_Y,
          targetX: STARTING_X,
          targetY: STARTING_Y,
          isMoving: false,
        };
      });
      setHighestRow(START_ROW);
    }, 1000); // 1 second pause
    
  }, [playSound, isInvincible, createDeathParticles]);

  const collectPowerUp = useCallback(() => {
    if (!powerUp || powerUp.collected) return;
    
    setPowerUp(prev => prev ? { ...prev, collected: true } : null);
    playSound('victory');
    
    if (powerUp.type === 'extraLife') {
      setPlayer(prev => ({ ...prev, lives: Math.min(prev.lives + 1, 5) }));
    } else if (powerUp.type === 'invincibility') {
      setIsInvincible(true);
      if (invincibleTimerRef.current) {
        clearTimeout(invincibleTimerRef.current);
      }
      invincibleTimerRef.current = window.setTimeout(() => {
        setIsInvincible(false);
      }, 5000);
    }
  }, [powerUp, playSound]);

  const checkHomeSpot = useCallback((playerX: number, playerY: number) => {
    if (playerY > TILE_SIZE) return false;

    const spotIndex = homeSpots.findIndex(spot => 
      !spot.filled && 
      Math.abs((playerX + PLAYER_SIZE / 2) - (spot.x + TILE_SIZE / 2)) < TILE_SIZE / 2
    );

    if (spotIndex !== -1) {
      playSound('victory');
      setHomeSpots(prev => {
        const updated = [...prev];
        updated[spotIndex] = { ...updated[spotIndex], filled: true };
        return updated;
      });
      setPlayer(prev => ({
        ...prev,
        score: prev.score + POINTS.REACH_HOME,
        x: STARTING_X,
        y: STARTING_Y,
        targetX: STARTING_X,
        targetY: STARTING_Y,
        isMoving: false,
      }));
      setHighestRow(START_ROW);
      setPowerUp(createPowerUp()); // Chance for new power-up
      return true;
    }

    handleDeath('splash');
    return true;
  }, [homeSpots, playSound, handleDeath]);

  const movePlayer = useCallback((direction: SwipeDirection) => {
    if (!direction || player.isMoving || isGameOver) return;

    setPlayer(prev => {
      let newX = prev.x;
      let newY = prev.y;

      switch (direction) {
        case 'up':
          newY = Math.max(0, prev.y - TILE_SIZE);
          break;
        case 'down':
          newY = Math.min(STARTING_Y, prev.y + TILE_SIZE);
          break;
        case 'left':
          newX = Math.max(0, prev.x - TILE_SIZE);
          break;
        case 'right':
          newX = Math.min(GAME_WIDTH - PLAYER_SIZE, prev.x + TILE_SIZE);
          break;
      }

      if (newX !== prev.x || newY !== prev.y) {
        playSound('hop');
        
        const newRow = Math.floor(newY / TILE_SIZE);
        let scoreBonus = 0;
        if (newRow < highestRow) {
          scoreBonus = POINTS.MOVE_FORWARD * (highestRow - newRow);
          setHighestRow(newRow);
        }

        return {
          ...prev,
          targetX: newX,
          targetY: newY,
          isMoving: true,
          score: prev.score + scoreBonus,
        };
      }

      return prev;
    });
  }, [player.isMoving, isGameOver, playSound, highestRow]);

  // Check if all homes are filled
  useEffect(() => {
    if (homeSpots.every(spot => spot.filled)) {
      playSound('levelup');
      setPlayer(prev => ({
        ...prev,
        score: prev.score + POINTS.ALL_HOMES_FILLED + POINTS.LEVEL_COMPLETE * level,
      }));
      setLevel(prev => prev + 1);
      setHomeSpots(HOME_SPOTS.map(h => ({ ...h })));
      setHighestRow(START_ROW);
      resetPlayer();
      initializeLanes(level + 1);
    }
  }, [homeSpots, level, playSound, resetPlayer, initializeLanes]);

  // Game loop
  useEffect(() => {
    if (isGameOver) return;

    const gameLoop = (timestamp: number) => {
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (deltaTime > 100) {
        animationRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const currentPlayer = playerRef.current;
      const playerRow = Math.floor(currentPlayer.y / TILE_SIZE);
      const progressToGoal = Math.max(0, Math.min(1, (START_ROW - playerRow) / START_ROW));

      // Base progressive speed (reduced by 10%: 0.27 + 0.63 progression, 0.9225 multiplier)
      const progressiveSpeedMultiplier = (0.27 + progressToGoal * 0.63) * 1.025 * 0.9;

      // --- Update lanes (no nested setState)
      const laneGap = (laneType: Lane['type']) => {
        if (laneType === 'road') return level === 1 ? TILE_SIZE * 2 : TILE_SIZE;
        if (laneType === 'water') return level === 1 ? TILE_SIZE : Math.round(TILE_SIZE * 0.8);
        return 0;
      };

      const wrapBuffer = 80;

      const nextLanes: Lane[] = lanesRef.current.map(lane => {
        if (lane.type === 'safe' || lane.type === 'home') return lane;

        const minGap = lane.type === 'road' ? (level === 1 ? TILE_SIZE * 2 : TILE_SIZE) : TILE_SIZE;

        // First pass: calculate new positions
        const moved = lane.objects.map(obj => {
          const dx = obj.speed * obj.direction * progressiveSpeedMultiplier * (deltaTime / 16);
          const x = obj.x + dx;

          const wrappedRight = obj.direction === 1 && x > GAME_WIDTH + wrapBuffer;
          const wrappedLeft = obj.direction === -1 && x < -obj.width - wrapBuffer;

          let nextObj: GameObject = { ...obj, x };

          // Handle diving turtles with phases
          if (obj.type === 'turtle' && obj.diveTimer !== undefined && obj.divePhase) {
            let newDiveTimer = obj.diveTimer - deltaTime;
            let newDivePhase = obj.divePhase;

            if (newDiveTimer <= 0) {
              const phaseConfig = DIVE_PHASES[obj.divePhase];
              newDivePhase = phaseConfig.next;
              newDiveTimer = DIVE_PHASES[newDivePhase].duration + (newDivePhase === 'surface' ? Math.random() * 2000 : 0);
            }

            nextObj = {
              ...nextObj,
              diveTimer: newDiveTimer,
              divePhase: newDivePhase,
              isDiving: newDivePhase === 'submerged',
            };
          }

          return { obj: nextObj, wrapped: wrappedRight || wrappedLeft };
        });

        // Second pass: prevent non-motorcycle vehicles from overlapping on roads
        if (lane.type === 'road') {
          const nonWrapped = moved.filter(m => !m.wrapped);
          
          if (lane.direction === 1) {
            // Moving right: sort by x descending (rightmost first)
            nonWrapped.sort((a, b) => b.obj.x - a.obj.x);
            for (let i = 1; i < nonWrapped.length; i++) {
              const ahead = nonWrapped[i - 1];
              const behind = nonWrapped[i];
              
              // Skip if both are motorcycles
              if (ahead.obj.type === 'motorcycle' && behind.obj.type === 'motorcycle') continue;
              
              // Check if behind vehicle is too close to ahead vehicle
              const requiredGap = (ahead.obj.type === 'motorcycle' || behind.obj.type === 'motorcycle') 
                ? minGap * 0.6 
                : minGap;

              // Ensure behind.right <= ahead.left - gap
              const desiredX = ahead.obj.x - requiredGap - behind.obj.width;
              if (behind.obj.x > desiredX) {
                behind.obj = { ...behind.obj, x: desiredX };
              }
            }
          } else {
            // Moving left: sort by x ascending (leftmost first)
            nonWrapped.sort((a, b) => a.obj.x - b.obj.x);
            for (let i = 1; i < nonWrapped.length; i++) {
              const ahead = nonWrapped[i - 1];
              const behind = nonWrapped[i];
              
              // Skip if both are motorcycles
              if (ahead.obj.type === 'motorcycle' && behind.obj.type === 'motorcycle') continue;
              
              // Check if behind vehicle is too close to ahead vehicle
              const requiredGap = (ahead.obj.type === 'motorcycle' || behind.obj.type === 'motorcycle') 
                ? minGap * 0.6 
                : minGap;

              // Ensure behind.left >= ahead.right + gap
              const desiredX = ahead.obj.x + ahead.obj.width + requiredGap;
              if (behind.obj.x < desiredX) {
                behind.obj = { ...behind.obj, x: desiredX };
              }
            }
          }
        }

        // Re-insert wrapped objects at the correct edge (always off-screen)
        if (moved.some(m => m.wrapped)) {
          const baseGap = laneGap(lane.type);
          const nonWrapped = moved.filter(m => !m.wrapped);
          const wrapped = moved.filter(m => m.wrapped);

          if (lane.direction === 1) {
            // Objects move right, so respawn at left edge (off-screen)
            let insertX = nonWrapped.length 
              ? Math.min(...nonWrapped.map(m => m.obj.x)) 
              : -wrapBuffer;
            insertX = Math.min(insertX, -wrapBuffer);
            for (const w of wrapped) {
              // Motorcycles can be closer to other vehicles
              const isMotorcycle = w.obj.type === 'motorcycle';
              const gap = isMotorcycle ? baseGap * 0.6 : baseGap;
              insertX -= w.obj.width + gap;
              w.obj = { ...w.obj, x: insertX };
            }
          } else {
            // Objects move left, so respawn at right edge (off-screen)
            let insertX = nonWrapped.length 
              ? Math.max(...nonWrapped.map(m => m.obj.x + m.obj.width)) 
              : GAME_WIDTH + wrapBuffer;
            insertX = Math.max(insertX, GAME_WIDTH + wrapBuffer);
            for (const w of wrapped) {
              // Motorcycles can be closer to other vehicles
              const isMotorcycle = w.obj.type === 'motorcycle';
              const gap = isMotorcycle ? baseGap * 0.6 : baseGap;
              w.obj = { ...w.obj, x: insertX + gap };
              insertX += w.obj.width + gap;
            }
          }
        }

        return { ...lane, objects: moved.map(m => m.obj) };
      });

      lanesRef.current = nextLanes;
      setLanes(nextLanes);

      // --- Update player (movement + water support/carry)
      let nextPlayer: Player = currentPlayer;

      if (currentPlayer.isMoving) {
        const dx = currentPlayer.targetX - currentPlayer.x;
        const dy = currentPlayer.targetY - currentPlayer.y;
        const moveSpeed = 8;

        if (Math.abs(dx) < moveSpeed && Math.abs(dy) < moveSpeed) {
          nextPlayer = { ...currentPlayer, x: currentPlayer.targetX, y: currentPlayer.targetY, isMoving: false };
        } else {
          nextPlayer = {
            ...currentPlayer,
            x: currentPlayer.x + Math.sign(dx) * Math.min(Math.abs(dx), moveSpeed),
            y: currentPlayer.y + Math.sign(dy) * Math.min(Math.abs(dy), moveSpeed),
          };
        }
      }

      // Water: die only in gaps (no platform support) and get carried when supported.
      if (!nextPlayer.isMoving) {
        const row = Math.floor(nextPlayer.y / TILE_SIZE);
        const cfg = LANES_CONFIG[row];

        if (cfg?.type === 'water') {
          const lane = nextLanes.find(l => Math.floor(l.y / TILE_SIZE) === row);
          if (lane) {
            const support = getWaterSupport(nextPlayer, lane, level);
            if (!support.supported) {
              handleDeath('splash');
              animationRef.current = requestAnimationFrame(gameLoop);
              return;
            }

            const carryDx = support.carrySpeed * support.carryDir * progressiveSpeedMultiplier * (deltaTime / 16) * 0.5;
            const carriedX = nextPlayer.x + carryDx;

            if (carriedX < -PLAYER_SIZE || carriedX > GAME_WIDTH) {
              handleDeath('splash');
              animationRef.current = requestAnimationFrame(gameLoop);
              return;
            }

            nextPlayer = { ...nextPlayer, x: carriedX, targetX: carriedX };
          }
        }
      }

      // Only commit when something actually changed
      if (
        nextPlayer.x !== currentPlayer.x ||
        nextPlayer.y !== currentPlayer.y ||
        nextPlayer.isMoving !== currentPlayer.isMoving ||
        nextPlayer.targetX !== currentPlayer.targetX ||
        nextPlayer.targetY !== currentPlayer.targetY
      ) {
        setPlayer(nextPlayer);
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isGameOver, level, handleDeath]);

  // Collision detection (road + home + power-up only; water handled in game loop)
  useEffect(() => {
    if (isGameOver || player.isMoving) return;

    const playerRow = Math.floor(player.y / TILE_SIZE);
    const laneConfig = LANES_CONFIG[playerRow];

    if (!laneConfig) return;

    // Check power-up collection (safe zone)
    if (playerRow === MID_SAFE_ROW && powerUp && !powerUp.collected) {
      const playerCenterX = player.x + PLAYER_SIZE / 2;
      const distance = Math.abs(playerCenterX - (powerUp.x + 15));
      if (distance < 30) {
        collectPowerUp();
      }
    }

    // Check home spots
    if (laneConfig.type === 'home') {
      checkHomeSpot(player.x, player.y);
      return;
    }

    // Road collision
    if (laneConfig.type === 'road') {
      const lane = lanes.find(l => Math.floor(l.y / TILE_SIZE) === playerRow);
      if (!lane) return;

      const playerLeft = player.x + 4;
      const playerRight = player.x + PLAYER_SIZE - 4;

      for (const obj of lane.objects) {
        if (playerRight > obj.x + 4 && playerLeft < obj.x + obj.width - 4) {
          handleDeath('crash');
          return;
        }
      }
    }
  }, [player.x, player.y, player.isMoving, lanes, isGameOver, handleDeath, checkHomeSpot, powerUp, collectPowerUp]);

  return {
    player,
    lanes,
    homeSpots,
    level,
    isGameOver,
    powerUp,
    isInvincible,
    deathEffect,
    startGame,
    continueGame,
    continuesRemaining: MAX_CONTINUES - continuesUsed,
    movePlayer,
  };
};
