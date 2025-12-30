import { useState, useCallback, useRef, useEffect } from 'react';
import { Player, Lane, GameObject, HomeSpot, SwipeDirection } from '@/lib/gameTypes';
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

// Vehicle types with their tile spans
const VEHICLE_TYPES = {
  tiny: ['motorcycle'], // Very small, fast
  small: ['car-small'], // 1 tile
  medium: ['car', 'car-wide'], // ~1.25-2 tiles
  large: ['truck', 'truck-long'], // 2-3 tiles
};

const getRandomVehicleType = (level: number, laneIndex: number, objectIndex: number): string => {
  const seed = laneIndex * 7 + level * 13 + objectIndex * 11;
  
  if (level <= 2) {
    // Levels 1-2: mostly small and medium vehicles, occasional motorcycle
    const types = ['car-small', 'car-small', 'car', 'car-wide', 'motorcycle'];
    return types[seed % types.length];
  } else {
    // Level 3+: include some large vehicles and more motorcycles
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
  
  // More spacing on level 1, decreases with level
  const baseSpacing = isRoad ? (level === 1 ? 340 : 280) : 160; // Tighter water platform spacing
  const spacingReduction = Math.min((level - 1) * 25, 80); // Cap reduction
  const spacing = Math.max(baseSpacing - spacingReduction, isRoad ? 160 : 120);
  
  const numObjects = Math.ceil((GAME_WIDTH + spacing * 2) / spacing);
  const speedMultiplier = 1 + (level - 1) * 0.12; // Slightly slower speed increase

  for (let i = 0; i < numObjects; i++) {
    const isTurtle = laneConfig.objectType === 'turtle';
    
    // For road lanes, pick varied vehicle types
    let objectType = laneConfig.objectType;
    if (isRoad) {
      objectType = getRandomVehicleType(level, laneConfig.y, i);
    }
    
    const objectWidth = OBJECT_WIDTHS[objectType] || 60;
    
    // Add some randomness to spacing for variety
    const randomOffset = isRoad ? (Math.sin(i * 3.7 + laneConfig.y) * 30) : 0;
    
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
      diveTimer: isTurtle ? Math.random() * 3000 + 2000 : undefined,
      colorVariant: Math.floor(Math.random() * 4), // Fixed color per vehicle
    });
  }

  return objects;
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
    initializeLanes(1);
  }, [initializeLanes]);

  const handleDeath = useCallback((type: 'splash' | 'crash') => {
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
  }, [playSound]);

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
      return true;
    }

    // Hit the edge or unfillable area
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
        // Row 12 = start (0.3x), Row 0 = goal (1.0x)
        // Speed ramps in 0.1x increments from 0.3 to 1.0
        // Each ~1.7 rows adds 0.1x speed
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

            // Handle diving turtles
            if (obj.type === 'turtle' && obj.diveTimer !== undefined) {
              let newDiveTimer = obj.diveTimer - deltaTime;
              let newIsDiving = obj.isDiving;

              if (newDiveTimer <= 0) {
                newIsDiving = !newIsDiving;
                // Dive for 1.5s, surface for 3-5s
                newDiveTimer = newIsDiving ? 1500 : 3000 + Math.random() * 2000;
              }

              return { ...obj, x: newX, diveTimer: newDiveTimer, isDiving: newIsDiving };
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

    // Check home spots
    if (laneConfig.type === 'home') {
      checkHomeSpot(player.x, player.y);
      return;
    }

    const lane = lanes.find(l => Math.floor(l.y / TILE_SIZE) === playerRow);
    if (!lane) return;

    const playerLeft = player.x;
    const playerRight = player.x + PLAYER_SIZE;
    const playerCenterX = player.x + PLAYER_SIZE / 2;

    if (lane.type === 'road') {
      // Check collision with cars/trucks
      for (const obj of lane.objects) {
        if (playerRight > obj.x && playerLeft < obj.x + obj.width) {
          handleDeath('crash');
          return;
        }
      }
    } else if (lane.type === 'water') {
      // Must be on a log/turtle (not diving)
      let onPlatform = false;
      let platformSpeed = 0;
      let platformDirection = 0;

      for (const obj of lane.objects) {
        const isOnObject = playerCenterX > obj.x && playerCenterX < obj.x + obj.width;
        
        if (isOnObject) {
          // Check if turtle is diving
          if (obj.type === 'turtle' && obj.isDiving) {
            // Turtle is diving, player falls in water
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
  }, [player.x, player.y, player.isMoving, lanes, isGameOver, handleDeath, checkHomeSpot]);

  return {
    player,
    lanes,
    homeSpots,
    level,
    isGameOver,
    startGame,
    movePlayer,
  };
};
