import { useState, useCallback, useRef, useEffect } from 'react';
import { Player, Lane, GameObject, HomeSpot, SwipeDirection, PowerUp } from '@/lib/gameTypes';
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
  // Tile-based overlap: if frog touches ANY tile occupied by a platform, it's safe.
  const frogRange = getTileRange(player.x, player.x + PLAYER_SIZE);

  for (const obj of lane.objects) {
    const platformRange = getTileRange(obj.x, obj.x + obj.width);
    if (!rangesOverlap(frogRange, platformRange)) continue;

    if (obj.type === 'turtle' && !isTurtleSafeToStandOn(obj, level)) {
      // This platform is currently "water"; keep searching in case another platform overlaps too.
      continue;
    }

    return {
      supported: true,
      carrySpeed: obj.speed,
      carryDir: obj.direction,
    };
  }

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

const LOG_TYPES = ['log-short', 'log-medium', 'log-long'] as const;
const pickLogType = () => LOG_TYPES[Math.floor(Math.random() * LOG_TYPES.length)];

const createLaneObjects = (laneConfig: typeof LANES_CONFIG[number], level: number): GameObject[] => {
  if (laneConfig.type === 'safe' || laneConfig.type === 'home' || !laneConfig.objectType) {
    return [];
  }

  const isRoad = laneConfig.type === 'road';
  const isWater = laneConfig.type === 'water';

  // Road lanes: enforce big openings on level 1.
  if (isRoad) {
    const objects: GameObject[] = [];

    const baseSpacing = level === 1 ? 420 : 300;
    const spacingReduction = Math.min((level - 1) * 30, 110);

    const maxVehicleWidth = level <= 2 ? 80 : 120;
    const minRoadGap = level === 1 ? TILE_SIZE * 2 : TILE_SIZE; // 2 tiles on L1
    const minRoadSpacing = maxVehicleWidth + minRoadGap;

    const spacing = Math.max(baseSpacing - spacingReduction, minRoadSpacing);
    const numObjects = Math.ceil((GAME_WIDTH + spacing * 2) / spacing);
    const speedMultiplier = 1 + (level - 1) * 0.12;

    for (let i = 0; i < numObjects; i++) {
      const objectType = getRandomVehicleType(level, laneConfig.y, i);
      const objectWidth = OBJECT_WIDTHS[objectType] || 60;

      // IMPORTANT: don't add negative offsets on Level 1 roads (keeps guaranteed gaps)
      const randomOffset = level === 1 ? 0 : Math.sin(i * 3.7 + laneConfig.y) * 30;

      // Motorcycles are faster
      const speedBonus = objectType === 'motorcycle' ? 1.8 : 1;

      objects.push({
        x: i * spacing - objectWidth + randomOffset,
        y: laneConfig.y * TILE_SIZE,
        width: objectWidth,
        height: TILE_SIZE - 4,
        speed: (laneConfig.speed || 1) * speedMultiplier * speedBonus,
        direction: laneConfig.direction || 1,
        type: objectType,
        isDiving: false,
        divePhase: undefined,
        diveTimer: undefined,
        colorVariant: Math.floor(Math.random() * 4),
      });
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
        height: TILE_SIZE - 4,
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
    setHighestRow(12);
  }, []);

  const startGame = useCallback(() => {
    setLevel(1);
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
    setHighestRow(12);
    setIsGameOver(false);
    setIsInvincible(false);
    if (invincibleTimerRef.current) {
      clearTimeout(invincibleTimerRef.current);
    }
    initializeLanes(1);
  }, [initializeLanes]);

  const handleDeath = useCallback((type: 'splash' | 'crash') => {
    if (isInvincible) return; // Invincibility protects from death
    
    playSound(type);
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
    setHighestRow(12);
  }, [playSound, isInvincible]);

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
      setHighestRow(12);
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
      setHighestRow(12);
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

      // Update lane objects with progressive speed based on player position
      setPlayer(currentPlayer => {
        const playerRow = Math.floor(currentPlayer.y / TILE_SIZE);
        const progressToGoal = Math.max(0, Math.min(1, (12 - playerRow) / 12));
        // Base progressive speed + 3% global speed boost for smoother feel
        const progressiveSpeedMultiplier = (0.3 + (progressToGoal * 0.7)) * 1.03;

        setLanes(prevLanes => prevLanes.map(lane => {
          if (lane.type === 'safe' || lane.type === 'home') return lane;

          const isRoadLane = lane.type === 'road';

          // Keep wrap spacing consistent with spawn spacing (prevents overlaps)
          const baseSpacing = isRoadLane ? (level === 1 ? 420 : 300) : 180;
          const spacingReduction = isRoadLane ? Math.min((level - 1) * 30, 110) : Math.min((level - 1) * 15, 40);
          const maxVehicleWidth = level <= 2 ? 80 : 120;
          const minRoadGap = level === 1 ? TILE_SIZE * 2 : TILE_SIZE;
          const minRoadSpacing = maxVehicleWidth + minRoadGap;
          const minWaterSpacing = 140;

          const spacing = isRoadLane
            ? Math.max(baseSpacing - spacingReduction, minRoadSpacing)
            : Math.max(baseSpacing - spacingReduction, minWaterSpacing);

          const wrapBuffer = 60;

          const moved = lane.objects.map((obj, index) => {
            const dx = obj.speed * obj.direction * progressiveSpeedMultiplier * (deltaTime / 16);
            let newX = obj.x + dx;

            const wrappedRight = obj.direction === 1 && newX > GAME_WIDTH + wrapBuffer;
            const wrappedLeft = obj.direction === -1 && newX < -obj.width - wrapBuffer;

            // Handle diving turtles with phases
            let nextObj: GameObject = { ...obj, x: newX };
            if (obj.type === 'turtle' && obj.diveTimer !== undefined && obj.divePhase) {
              let newDiveTimer = obj.diveTimer - deltaTime;
              let newDivePhase = obj.divePhase;

              if (newDiveTimer <= 0) {
                const phaseConfig = DIVE_PHASES[obj.divePhase];
                newDivePhase = phaseConfig.next;
                // Only surface phase gets extra jitter so they don't sync
                newDiveTimer = DIVE_PHASES[newDivePhase].duration + (newDivePhase === 'surface' ? Math.random() * 2000 : 0);
              }

              nextObj = {
                ...nextObj,
                diveTimer: newDiveTimer,
                divePhase: newDivePhase,
                isDiving: newDivePhase === 'submerged',
              };
            }

            return {
              index,
              wrapped: wrappedRight || wrappedLeft,
              wrappedDir: wrappedRight ? 1 : wrappedLeft ? -1 : 0,
              obj: nextObj,
            };
          });

          // Fix overlaps on wrap: place wrapped objects behind the pack by `spacing`
          if (moved.some(m => m.wrapped)) {
            if (lane.direction === 1) {
              const nonWrapped = moved.filter(m => !m.wrapped).map(m => m.obj.x);
              let insertX = nonWrapped.length ? Math.min(...nonWrapped) : -wrapBuffer;
              const wrapped = moved.filter(m => m.wrapped).sort((a, b) => a.index - b.index);
              for (const w of wrapped) {
                insertX -= spacing;
                w.obj = { ...w.obj, x: insertX };
              }
            } else {
              const nonWrapped = moved.filter(m => !m.wrapped).map(m => m.obj.x);
              let insertX = nonWrapped.length ? Math.max(...nonWrapped) : GAME_WIDTH + wrapBuffer;
              const wrapped = moved.filter(m => m.wrapped).sort((a, b) => a.index - b.index);
              for (const w of wrapped) {
                insertX += spacing;
                w.obj = { ...w.obj, x: insertX };
              }
            }
          }

          const updatedObjects = moved.map(m => m.obj);
          return { ...lane, objects: updatedObjects };
        }));

        return currentPlayer;
      });

      // Update player position (smooth movement)
      setPlayer(prev => {
        if (!prev.isMoving) return prev;

        const dx = prev.targetX - prev.x;
        const dy = prev.targetY - prev.y;
        const moveSpeed = 8;

        if (Math.abs(dx) < moveSpeed && Math.abs(dy) < moveSpeed) {
          return { ...prev, x: prev.targetX, y: prev.targetY, isMoving: false };
        }

        return {
          ...prev,
          x: prev.x + Math.sign(dx) * Math.min(Math.abs(dx), moveSpeed),
          y: prev.y + Math.sign(dy) * Math.min(Math.abs(dy), moveSpeed),
        };
      });

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isGameOver, level]);

  // Collision detection
  useEffect(() => {
    if (isGameOver || player.isMoving) return;

    const playerRow = Math.floor(player.y / TILE_SIZE);
    const laneConfig = LANES_CONFIG[playerRow];

    if (!laneConfig) return;

    // Check power-up collection (safe zone at row 6)
    if (playerRow === 6 && powerUp && !powerUp.collected) {
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

    const lane = lanes.find(l => Math.floor(l.y / TILE_SIZE) === playerRow);
    if (!lane) return;

    const playerLeft = player.x + 4; // road collision inset
    const playerRight = player.x + PLAYER_SIZE - 4;

    if (lane.type === 'road') {
      for (const obj of lane.objects) {
        if (playerRight > obj.x + 4 && playerLeft < obj.x + obj.width - 4) {
          handleDeath('crash');
          return;
        }
      }
    } else if (lane.type === 'water') {
      // WATER COLLISION LOGIC:
      // - Being ON a log or turtle = SAFE (frog lives)
      // - Being IN the water (not on any platform) = DEATH
      // - Turtles that are fully submerged = treated as water (death)
      
      // Use very generous overlap detection - if ANY part of frog touches platform, it's safe
      const frogLeft = player.x;
      const frogRight = player.x + PLAYER_SIZE;

      let foundSafePlatform = false;
      let platformSpeed = 0;
      let platformDirection = 0;

      for (const obj of lane.objects) {
        // Check if frog overlaps this platform at all
        const platformLeft = obj.x;
        const platformRight = obj.x + obj.width;
        
        // Overlap check: frog and platform rectangles intersect
        const overlaps = frogRight > platformLeft && frogLeft < platformRight;
        
        if (!overlaps) continue;

        // For turtles, check if they're safe to stand on
        if (obj.type === 'turtle') {
          const phase = obj.divePhase || 'surface';
          
          // Only FULLY submerged turtles are dangerous
          // surface, diving, rising = all SAFE
          if (phase === 'submerged') {
            // On level 1, give grace period at start/end of submerge
            const submergedDuration = DIVE_PHASES.submerged.duration;
            const remaining = obj.diveTimer ?? 0;
            const isInGracePeriod = level === 1 && (remaining >= submergedDuration * 0.75 || remaining <= submergedDuration * 0.25);
            
            if (!isInGracePeriod) {
              // Turtle is fully underwater - frog falls in
              continue; // Check other platforms, maybe there's a log nearby
            }
          }
        }

        // Platform is safe! Frog survives
        foundSafePlatform = true;
        platformSpeed = obj.speed;
        platformDirection = obj.direction;
        break;
      }

      if (!foundSafePlatform) {
        // Frog is in the water - dies
        handleDeath('splash');
        return;
      }

      // Move frog with the platform
      setPlayer(prev => {
        const newX = prev.x + platformSpeed * platformDirection * 0.5;
        // Carried off screen = death
        if (newX < -PLAYER_SIZE || newX > GAME_WIDTH) {
          handleDeath('splash');
          return prev;
        }
        return { ...prev, x: newX, targetX: newX };
      });
    }
  }, [player.x, player.y, player.isMoving, lanes, level, isGameOver, handleDeath, checkHomeSpot, powerUp, collectPowerUp]);

  return {
    player,
    lanes,
    homeSpots,
    level,
    isGameOver,
    powerUp,
    isInvincible,
    startGame,
    movePlayer,
  };
};
