import { useEffect, useRef } from 'react';
import { Player, Lane, HomeSpot } from '@/lib/gameTypes';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, PLAYER_SIZE, COLORS } from '@/lib/gameConstants';

interface GameCanvasProps {
  player: Player;
  lanes: Lane[];
  homeSpots: HomeSpot[];
  level: number;
}

export const GameCanvas = ({ player, lanes, homeSpots, level }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw lanes backgrounds
    lanes.forEach(lane => {
      const laneY = lane.y;
      
      switch (lane.type) {
        case 'road':
          ctx.fillStyle = COLORS.road;
          ctx.fillRect(0, laneY, GAME_WIDTH, TILE_SIZE);
          // Road markings
          ctx.fillStyle = '#ffffff';
          for (let x = 10; x < GAME_WIDTH; x += 60) {
            ctx.fillRect(x, laneY + TILE_SIZE / 2 - 2, 30, 4);
          }
          break;
        case 'water':
          ctx.fillStyle = COLORS.water;
          ctx.fillRect(0, laneY, GAME_WIDTH, TILE_SIZE);
          // Water ripples
          ctx.strokeStyle = 'rgba(100, 180, 255, 0.3)';
          ctx.lineWidth = 2;
          for (let x = 0; x < GAME_WIDTH; x += 40) {
            ctx.beginPath();
            ctx.arc(x + Math.sin(Date.now() / 500 + x) * 5, laneY + TILE_SIZE / 2, 8, 0, Math.PI);
            ctx.stroke();
          }
          break;
        case 'safe':
          ctx.fillStyle = COLORS.grass;
          ctx.fillRect(0, laneY, GAME_WIDTH, TILE_SIZE);
          // Grass texture
          ctx.fillStyle = '#3d7a32';
          for (let x = 5; x < GAME_WIDTH; x += 15) {
            ctx.fillRect(x, laneY + 10, 2, 8);
            ctx.fillRect(x + 5, laneY + 15, 2, 10);
          }
          break;
        case 'home':
          ctx.fillStyle = COLORS.water;
          ctx.fillRect(0, laneY, GAME_WIDTH, TILE_SIZE);
          break;
      }
    });

    // Draw home spots
    homeSpots.forEach(spot => {
      if (spot.filled) {
        // Filled with frog
        ctx.fillStyle = COLORS.lilypad;
        ctx.beginPath();
        ctx.ellipse(spot.x + 20, 20, 18, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        // Mini frog
        ctx.fillStyle = COLORS.player;
        ctx.fillRect(spot.x + 12, 12, 16, 16);
      } else {
        // Empty lily pad
        ctx.fillStyle = COLORS.home;
        ctx.beginPath();
        ctx.ellipse(spot.x + 20, 20, 18, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2d7a2d';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    // Draw lane objects
    lanes.forEach(lane => {
      lane.objects.forEach(obj => {
        const x = Math.round(obj.x);
        const y = Math.round(obj.y) + 2;
        const h = obj.height;

        ctx.save();

        switch (obj.type) {
          case 'car':
            // Car body
            ctx.fillStyle = obj.x % 200 > 100 ? COLORS.car1 : COLORS.car2;
            ctx.fillRect(x, y + 4, obj.width, h - 8);
            // Windows
            ctx.fillStyle = '#87ceeb';
            ctx.fillRect(x + 10, y + 8, 15, h - 16);
            ctx.fillRect(x + 30, y + 8, 12, h - 16);
            // Wheels
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x + 5, y, 10, 6);
            ctx.fillRect(x + 5, y + h - 6, 10, 6);
            ctx.fillRect(x + obj.width - 15, y, 10, 6);
            ctx.fillRect(x + obj.width - 15, y + h - 6, 10, 6);
            break;

          case 'truck':
            // Truck cab
            ctx.fillStyle = COLORS.truck;
            ctx.fillRect(x, y + 2, 25, h - 4);
            // Truck cargo
            ctx.fillStyle = '#d4a853';
            ctx.fillRect(x + 25, y, obj.width - 25, h);
            // Windows
            ctx.fillStyle = '#87ceeb';
            ctx.fillRect(x + 5, y + 6, 12, h - 14);
            // Wheels
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x + 5, y - 2, 12, 6);
            ctx.fillRect(x + 5, y + h - 4, 12, 6);
            ctx.fillRect(x + obj.width - 20, y - 2, 12, 6);
            ctx.fillRect(x + obj.width - 20, y + h - 4, 12, 6);
            break;

          case 'log-short':
          case 'log-medium':
          case 'log-long':
            // Log
            ctx.fillStyle = COLORS.log;
            ctx.fillRect(x, y + 4, obj.width, h - 8);
            // Log ends
            ctx.fillStyle = '#6d5a4e';
            ctx.beginPath();
            ctx.ellipse(x + 4, y + h / 2, 4, (h - 8) / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(x + obj.width - 4, y + h / 2, 4, (h - 8) / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Wood grain
            ctx.strokeStyle = '#7d6e5e';
            ctx.lineWidth = 1;
            for (let lx = x + 15; lx < x + obj.width - 15; lx += 20) {
              ctx.beginPath();
              ctx.moveTo(lx, y + 8);
              ctx.lineTo(lx + 5, y + h - 8);
              ctx.stroke();
            }
            break;

          case 'turtle':
            const turtleCount = 3;
            const turtleSpacing = obj.width / turtleCount;
            const isDiving = obj.isDiving || false;
            
            // Set opacity based on diving state
            ctx.globalAlpha = isDiving ? 0.3 : 1.0;
            
            for (let i = 0; i < turtleCount; i++) {
              const tx = x + i * turtleSpacing + 5;
              // Shell
              ctx.fillStyle = isDiving ? '#2d5a5a' : COLORS.turtle;
              ctx.beginPath();
              ctx.ellipse(tx + 12, y + h / 2 + (isDiving ? 4 : 0), 12, isDiving ? 8 : 10, 0, 0, Math.PI * 2);
              ctx.fill();
              
              if (!isDiving) {
                // Shell pattern (only visible when not diving)
                ctx.fillStyle = '#388e3c';
                ctx.beginPath();
                ctx.ellipse(tx + 12, y + h / 2, 8, 6, 0, 0, Math.PI * 2);
                ctx.fill();
                // Head
                ctx.fillStyle = '#66bb6a';
                ctx.fillRect(tx + 22, y + h / 2 - 4, 6, 8);
                // Flippers
                ctx.fillStyle = '#4caf50';
                ctx.fillRect(tx + 4, y + 4, 6, 6);
                ctx.fillRect(tx + 14, y + 4, 6, 6);
                ctx.fillRect(tx + 4, y + h - 10, 6, 6);
                ctx.fillRect(tx + 14, y + h - 10, 6, 6);
              }
            }
            
            ctx.globalAlpha = 1.0;
            break;
        }

        ctx.restore();
      });
    });

    // Draw player (frog)
    const px = Math.round(player.x);
    const py = Math.round(player.y);

    ctx.save();
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(px + PLAYER_SIZE / 2, py + PLAYER_SIZE + 2, PLAYER_SIZE / 2 - 2, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(px + 4, py + 8, PLAYER_SIZE - 8, PLAYER_SIZE - 12);
    
    // Head
    ctx.fillRect(px + 6, py + 2, PLAYER_SIZE - 12, 10);
    
    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 6, py, 8, 8);
    ctx.fillRect(px + PLAYER_SIZE - 14, py, 8, 8);
    
    // Pupils
    ctx.fillStyle = '#000000';
    ctx.fillRect(px + 10, py + 2, 3, 4);
    ctx.fillRect(px + PLAYER_SIZE - 12, py + 2, 3, 4);

    // Front legs
    ctx.fillStyle = '#5a9e45';
    ctx.fillRect(px, py + 12, 6, 8);
    ctx.fillRect(px + PLAYER_SIZE - 6, py + 12, 6, 8);

    // Back legs
    ctx.fillRect(px - 4, py + PLAYER_SIZE - 10, 10, 12);
    ctx.fillRect(px + PLAYER_SIZE - 6, py + PLAYER_SIZE - 10, 10, 12);

    // Feet
    ctx.fillStyle = '#4a8e35';
    ctx.fillRect(px - 6, py + PLAYER_SIZE, 12, 4);
    ctx.fillRect(px + PLAYER_SIZE - 6, py + PLAYER_SIZE, 12, 4);

    ctx.restore();

  }, [player, lanes, homeSpots, level]);

  return (
    <canvas
      ref={canvasRef}
      width={GAME_WIDTH}
      height={GAME_HEIGHT}
      className="border-4 border-emerald-700 rounded-lg shadow-2xl"
      style={{ 
        imageRendering: 'pixelated',
        maxWidth: '100%',
        height: 'auto'
      }}
    />
  );
};
