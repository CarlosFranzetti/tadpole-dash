import { useEffect, useRef } from 'react';
import { Player, Lane, HomeSpot, PowerUp } from '@/lib/gameTypes';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, PLAYER_SIZE, COLORS } from '@/lib/gameConstants';

interface GameCanvasProps {
  player: Player;
  lanes: Lane[];
  homeSpots: HomeSpot[];
  level: number;
  powerUp?: PowerUp | null;
  isInvincible?: boolean;
}

export const GameCanvas = ({ player, lanes, homeSpots, level, powerUp, isInvincible }: GameCanvasProps) => {
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

        const colorVariant = obj.colorVariant || 0;
        
        switch (obj.type) {
          case 'motorcycle':
            // Small fast motorcycle - harder to see
            const motoColors = ['#424242', '#616161', '#757575', '#5d4037'];
            ctx.fillStyle = motoColors[colorVariant % motoColors.length];
            // Body
            ctx.fillRect(x + 4, y + 12, obj.width - 8, h - 24);
            // Wheels
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(x + 6, y + h / 2, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + obj.width - 6, y + h / 2, 5, 0, Math.PI * 2);
            ctx.fill();
            // Rider helmet
            ctx.fillStyle = '#ffeb3b';
            ctx.fillRect(x + 10, y + 8, 8, 8);
            ctx.fillRect(x + 10, y + h - 16, 8, 8);
            break;

          case 'car-small':
            // Small compact car (1 tile)
            const smallCarColors = ['#9c27b0', '#00bcd4', '#4caf50', '#ff5722'];
            const smallCarRoofColors = ['#7b1fa2', '#0097a7', '#388e3c', '#e64a19'];
            ctx.fillStyle = smallCarColors[colorVariant % smallCarColors.length];
            ctx.fillRect(x + 2, y + 6, obj.width - 4, h - 12);
            // Roof
            ctx.fillStyle = smallCarRoofColors[colorVariant % smallCarRoofColors.length];
            ctx.fillRect(x + 8, y + 10, obj.width - 16, h - 20);
            // Windows
            ctx.fillStyle = '#87ceeb';
            ctx.fillRect(x + 10, y + 12, 8, h - 24);
            ctx.fillRect(x + 22, y + 12, 6, h - 24);
            // Wheels
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x + 4, y + 2, 8, 5);
            ctx.fillRect(x + 4, y + h - 7, 8, 5);
            ctx.fillRect(x + obj.width - 12, y + 2, 8, 5);
            ctx.fillRect(x + obj.width - 12, y + h - 7, 8, 5);
            break;

          case 'car':
            // Standard car
            const carColors = [COLORS.car1, COLORS.car2, '#8bc34a', '#ff9800'];
            ctx.fillStyle = carColors[colorVariant % carColors.length];
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

          case 'car-wide':
            // Wide SUV/van style (2 tiles)
            const wideCarColors = ['#795548', '#607d8b', '#3f51b5', '#009688'];
            ctx.fillStyle = wideCarColors[colorVariant % wideCarColors.length];
            ctx.fillRect(x, y + 2, obj.width, h - 4);
            // Roof rack
            ctx.fillStyle = '#424242';
            ctx.fillRect(x + 10, y, obj.width - 20, 4);
            // Windows
            ctx.fillStyle = '#87ceeb';
            ctx.fillRect(x + 8, y + 6, 18, h - 12);
            ctx.fillRect(x + 30, y + 6, 18, h - 12);
            ctx.fillRect(x + 52, y + 6, 18, h - 12);
            // Wheels
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x + 6, y - 2, 14, 6);
            ctx.fillRect(x + 6, y + h - 4, 14, 6);
            ctx.fillRect(x + obj.width - 20, y - 2, 14, 6);
            ctx.fillRect(x + obj.width - 20, y + h - 4, 14, 6);
            break;

          case 'truck':
            // Standard truck
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

          case 'truck-long':
            // Long semi truck (3 tiles)
            ctx.fillStyle = '#c62828';
            ctx.fillRect(x, y + 2, 30, h - 4);
            // Trailer
            ctx.fillStyle = '#37474f';
            ctx.fillRect(x + 30, y - 2, obj.width - 30, h + 4);
            // Trailer stripes
            ctx.fillStyle = '#546e7a';
            for (let stripe = 0; stripe < 3; stripe++) {
              ctx.fillRect(x + 40 + stripe * 25, y + 2, 15, h - 4);
            }
            // Cab windows
            ctx.fillStyle = '#87ceeb';
            ctx.fillRect(x + 5, y + 6, 16, h - 14);
            // Wheels (more wheels for long truck)
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x + 6, y - 2, 12, 6);
            ctx.fillRect(x + 6, y + h - 4, 12, 6);
            ctx.fillRect(x + 50, y - 2, 12, 6);
            ctx.fillRect(x + 50, y + h - 4, 12, 6);
            ctx.fillRect(x + obj.width - 25, y - 2, 12, 6);
            ctx.fillRect(x + obj.width - 25, y + h - 4, 12, 6);
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
            const divePhase = obj.divePhase || 'surface';
            
            // Calculate animation progress based on dive phase
            let diveProgress = 0;
            let opacity = 1.0;
            let yOffset = 0;
            let scale = 1.0;
            
            switch (divePhase) {
              case 'surface':
                diveProgress = 0;
                opacity = 1.0;
                yOffset = 0;
                scale = 1.0;
                break;
              case 'diving':
                // Animate from surface to submerged
                diveProgress = obj.diveTimer ? 1 - (obj.diveTimer / 800) : 0;
                opacity = 1.0 - (diveProgress * 0.7);
                yOffset = diveProgress * 6;
                scale = 1.0 - (diveProgress * 0.3);
                break;
              case 'submerged':
                diveProgress = 1;
                opacity = 0.3;
                yOffset = 6;
                scale = 0.7;
                break;
              case 'rising':
                // Animate from submerged to surface
                diveProgress = obj.diveTimer ? obj.diveTimer / 800 : 0;
                opacity = 0.3 + ((1 - diveProgress) * 0.7);
                yOffset = diveProgress * 6;
                scale = 0.7 + ((1 - diveProgress) * 0.3);
                break;
            }
            
            ctx.globalAlpha = opacity;
            
            for (let i = 0; i < turtleCount; i++) {
              const tx = x + i * turtleSpacing + 5;
              const shellRadiusX = 12 * scale;
              const shellRadiusY = 10 * scale;
              
              // Shell
              ctx.fillStyle = divePhase === 'submerged' ? '#2d5a5a' : COLORS.turtle;
              ctx.beginPath();
              ctx.ellipse(tx + 12, y + h / 2 + yOffset, shellRadiusX, shellRadiusY, 0, 0, Math.PI * 2);
              ctx.fill();
              
              if (divePhase === 'surface' || divePhase === 'rising') {
                // Shell pattern
                ctx.fillStyle = '#388e3c';
                ctx.beginPath();
                ctx.ellipse(tx + 12, y + h / 2 + yOffset, 8 * scale, 6 * scale, 0, 0, Math.PI * 2);
                ctx.fill();
                // Head
                ctx.fillStyle = '#66bb6a';
                ctx.fillRect(tx + 22, y + h / 2 - 4 + yOffset, 6 * scale, 8 * scale);
                // Flippers
                ctx.fillStyle = '#4caf50';
                const flipperSize = 6 * scale;
                ctx.fillRect(tx + 4, y + 4 + yOffset, flipperSize, flipperSize);
                ctx.fillRect(tx + 14, y + 4 + yOffset, flipperSize, flipperSize);
                ctx.fillRect(tx + 4, y + h - 10 + yOffset, flipperSize, flipperSize);
                ctx.fillRect(tx + 14, y + h - 10 + yOffset, flipperSize, flipperSize);
              }
            }
            
            ctx.globalAlpha = 1.0;
            break;
        }

        ctx.restore();
      });
    });

    // Draw power-up
    if (powerUp && !powerUp.collected) {
      const puX = powerUp.x;
      const puY = powerUp.y;
      const pulse = Math.sin(Date.now() / 200) * 2;
      
      ctx.save();
      
      if (powerUp.type === 'extraLife') {
        // Heart shape for extra life
        ctx.fillStyle = '#e91e63';
        ctx.beginPath();
        ctx.moveTo(puX + 15, puY + 8 + pulse);
        ctx.bezierCurveTo(puX + 15, puY + 5 + pulse, puX + 10, puY + pulse, puX + 5, puY + 5 + pulse);
        ctx.bezierCurveTo(puX, puY + 10 + pulse, puX, puY + 18 + pulse, puX + 15, puY + 28 + pulse);
        ctx.bezierCurveTo(puX + 30, puY + 18 + pulse, puX + 30, puY + 10 + pulse, puX + 25, puY + 5 + pulse);
        ctx.bezierCurveTo(puX + 20, puY + pulse, puX + 15, puY + 5 + pulse, puX + 15, puY + 8 + pulse);
        ctx.fill();
        // Glow
        ctx.shadowColor = '#e91e63';
        ctx.shadowBlur = 10;
        ctx.fill();
      } else {
        // Star shape for invincibility
        ctx.fillStyle = '#ffd700';
        const centerX = puX + 15;
        const centerY = puY + 15 + pulse;
        const outerRadius = 12;
        const innerRadius = 5;
        
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const px = centerX + Math.cos(angle) * radius;
          const py = centerY + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        // Glow
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 15;
        ctx.fill();
      }
      
      ctx.restore();
    }

    // Draw player (frog)
    const px = Math.round(player.x);
    const py = Math.round(player.y);

    ctx.save();
    
    // Invincibility glow effect
    if (isInvincible) {
      const glowPulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 20 * glowPulse;
    }
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(px + PLAYER_SIZE / 2, py + PLAYER_SIZE + 2, PLAYER_SIZE / 2 - 2, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = isInvincible ? '#ffd700' : COLORS.player;
    ctx.fillRect(px + 4, py + 8, PLAYER_SIZE - 8, PLAYER_SIZE - 12);
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

  }, [player, lanes, homeSpots, level, powerUp, isInvincible]);

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
