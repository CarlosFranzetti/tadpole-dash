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
const STARTING_Y = 12 * TILE_SIZE + 2;

// Turtle dive phases with durations
const DIVE_PHASES = {
  surface: { duration: 4000, next: 'diving' as const },
  diving: { duration: 800, next: 'submerged' as const },
  submerged: { duration: 2000, next: 'rising' as const },
  rising: { duration: 800, next: 'surface' as const },
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

const createLaneObjects = (laneConfig: typeof LANES_CONFIG[number], level: number): GameObject[] => {
  if (laneConfig.type === 'safe' || laneConfig.type === 'home' || !laneConfig.objectType) {
    return [];
  }

  const objects: GameObject[] = [];
  const isRoad = laneConfig.type === 'road';
  
  const baseSpacing = isRoad ? (level === 1 ? 340 : 280) : 160;
  const spacingReduction = Math.min((level - 1) * 25, 80);
  const spacing = Math.max(baseSpacing - spacingReduction, isRoad ? 160 : 120);
  
  const numObjects = Math.ceil((GAME_WIDTH + spacing * 2) / spacing);
  const speedMultiplier = 1 + (level - 1) * 0.12;

  for (let i = 0; i < numObjects; i++) {
    const isTurtle = laneConfig.objectType === 'turtle';
    
    let objectType = laneConfig.objectType;
    if (isRoad) {
      objectType = getRandomVehicleType(level, laneConfig.y, i);
    }
    
    const objectWidth = OBJECT_WIDTHS[objectType] || 60;
    const randomOffset = isRoad ? (Math.sin(i * 3.7 + laneConfig.y) * 30) : 0;
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
      divePhase: isTurtle ? 'surface' : undefined,
      diveTimer: isTurtle ? Math.random() * 2000 + 2000 : undefined,
      colorVariant: Math.floor(Math.random() * 4),
    });
  }

  return objects;
};

const createPowerUp = (): PowerUp | null => {
  if (Math.random() > 0.3) return null; // 30% chance to spawn
  
  const safeZoneY = 6 * TILE_SIZE;
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
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [homeSpots, setHomeSpots] = useState<HomeSpot[]>(HOME_SPOTS.map(h => ({ ...h })));
  const [isGameOver, setIsGameOver] = useState(false);
  const [highestRow, setHighestRow] = useState(12);
  const [powerUp, setPowerUp] = useState<PowerUp | null>(null);
  const [isInvincible, setIsInvincible] = useState(false);
  const invincibleTimerRef = useRef<number | null>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

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
        const progressiveSpeedMultiplier = 0.3 + (progressToGoal * 0.7);

        setLanes(prevLanes => prevLanes.map(lane => {
          if (lane.type === 'safe' || lane.type === 'home') return lane;

          const updatedObjects = lane.objects.map(obj => {
            let newX = obj.x + obj.speed * obj.direction * progressiveSpeedMultiplier * (deltaTime / 16);
            
            if (obj.direction === 1 && newX > GAME_WIDTH + 50) {
              newX = -obj.width - 50;
            } else if (obj.direction === -1 && newX < -obj.width - 50) {
              newX = GAME_WIDTH + 50;
            }

            // Handle diving turtles with phases
            if (obj.type === 'turtle' && obj.diveTimer !== undefined && obj.divePhase) {
              let newDiveTimer = obj.diveTimer - deltaTime;
              let newDivePhase = obj.divePhase;
              let newIsDiving = obj.isDiving;

              if (newDiveTimer <= 0) {
                const phaseConfig = DIVE_PHASES[obj.divePhase];
                newDivePhase = phaseConfig.next;
                newDiveTimer = DIVE_PHASES[newDivePhase].duration + (newDivePhase === 'surface' ? Math.random() * 2000 : 0);
                newIsDiving = newDivePhase === 'submerged';
              }

              return { ...obj, x: newX, diveTimer: newDiveTimer, divePhase: newDivePhase, isDiving: newIsDiving };
            }

            return { ...obj, x: newX };
          });

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
  }, [isGameOver]);

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

    const playerLeft = player.x + 4; // Small inset for more forgiving collision
    const playerRight = player.x + PLAYER_SIZE - 4;
    const playerCenterX = player.x + PLAYER_SIZE / 2;

    if (lane.type === 'road') {
      for (const obj of lane.objects) {
        if (playerRight > obj.x + 4 && playerLeft < obj.x + obj.width - 4) {
          handleDeath('crash');
          return;
        }
      }
    } else if (lane.type === 'water') {
      let onPlatform = false;
      let platformSpeed = 0;
      let platformDirection = 0;

      for (const obj of lane.objects) {
        // More forgiving platform detection - use wider bounds
        const isOnObject = playerCenterX >= obj.x - 5 && playerCenterX <= obj.x + obj.width + 5;
        
        if (isOnObject) {
          // Check if turtle is fully submerged (diving/rising phases are still safe)
          if (obj.type === 'turtle' && obj.divePhase === 'submerged') {
            handleDeath('splash');
            return;
          }
          onPlatform = true;
          platformSpeed = obj.speed;
          platformDirection = obj.direction;
          break;
        }
      }

      if (!onPlatform) {
        handleDeath('splash');
        return;
      }

      // Move with platform
      setPlayer(prev => {
        const newX = prev.x + platformSpeed * platformDirection * 0.5;
        if (newX < -PLAYER_SIZE || newX > GAME_WIDTH) {
          handleDeath('splash');
          return prev;
        }
        return { ...prev, x: newX, targetX: newX };
      });
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
    startGame,
    movePlayer,
  };
};
