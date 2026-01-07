import { useEffect, useRef } from 'react';
import { Player, Lane, HomeSpot, PowerUp, DeathEffect } from '@/lib/gameTypes';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, PLAYER_SIZE, COLORS } from '@/lib/gameConstants';

interface GameCanvasProps {
  player: Player;
  lanes: Lane[];
  homeSpots: HomeSpot[];
  level: number;
  powerUp?: PowerUp | null;
  isInvincible?: boolean;
  deathEffect?: DeathEffect | null;
}

// Smaller frog size (~23% reduction)
const FROG_SCALE = 0.77;
const FROG_SIZE = PLAYER_SIZE * FROG_SCALE;
const FROG_OFFSET = (PLAYER_SIZE - FROG_SIZE) / 2;

// Vehicle scale (15% smaller except motorcycles)
const VEHICLE_SCALE = 0.85;

// Lily pad colors for each slot
const LILYPAD_COLORS = [
  { base: '#2d8a2d', highlight: '#3da33d', texture: '#2d7a2d' },
  { base: '#1e7a4a', highlight: '#2d9a5a', texture: '#1a6a3a' },
  { base: '#3d7a1e', highlight: '#4d9a2e', texture: '#2d6a1a' },
  { base: '#2a6a5a', highlight: '#3a8a6a', texture: '#1a5a4a' },
  { base: '#4a7a2a', highlight: '#5a9a3a', texture: '#3a6a1a' },
];

// Water sparkle state
interface Sparkle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

export const GameCanvas = ({ player, lanes, homeSpots, level, powerUp, isInvincible, deathEffect }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparklesRef = useRef<Sparkle[]>([]);
  const frameCountRef = useRef(0);
  const deathFrameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    frameCountRef.current++;
    const frame = frameCountRef.current;

    // Update sparkles
    const waterLanes = lanes.filter(l => l.type === 'water');
    sparklesRef.current = sparklesRef.current.filter(s => s.life > 0).map(s => ({ ...s, life: s.life - 1 }));
    
    // Spawn new sparkles occasionally
    if (frame % 8 === 0 && waterLanes.length > 0) {
      const lane = waterLanes[Math.floor(Math.random() * waterLanes.length)];
      sparklesRef.current.push({
        x: Math.random() * GAME_WIDTH,
        y: lane.y + Math.random() * TILE_SIZE,
        life: 15 + Math.floor(Math.random() * 20),
        maxLife: 35,
      });
    }

    // Clear canvas
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw lanes backgrounds
    lanes.forEach((lane, laneIndex) => {
      const laneY = lane.y;
      
      switch (lane.type) {
        case 'road':
          ctx.fillStyle = COLORS.road;
          ctx.fillRect(0, laneY, GAME_WIDTH, TILE_SIZE);
          // Alternating road markings by row - dimmer yellow (30% less bright)
          ctx.fillStyle = '#b3b377';
          if (laneIndex % 2 === 0) {
            // Dashed center line
            for (let x = 10; x < GAME_WIDTH; x += 50) {
              ctx.fillRect(x, laneY + TILE_SIZE / 2 - 1, 25, 2);
            }
          } else {
            // Solid edge lines
            ctx.fillRect(0, laneY + 2, GAME_WIDTH, 2);
            ctx.fillRect(0, laneY + TILE_SIZE - 4, GAME_WIDTH, 2);
          }
          // Add line at top of road section (between road and grass)
          if (laneIndex === lanes.findIndex(l => l.type === 'road')) {
            ctx.fillStyle = '#4a4a4a';
            ctx.fillRect(0, laneY, GAME_WIDTH, 2);
          }
          break;
        case 'water':
          ctx.fillStyle = COLORS.water;
          ctx.fillRect(0, laneY, GAME_WIDTH, TILE_SIZE);
          break;
        case 'safe':
          ctx.fillStyle = COLORS.grass;
          ctx.fillRect(0, laneY, GAME_WIDTH, TILE_SIZE);
          // Nicer grass texture with varied blades
          ctx.fillStyle = '#3d8a32';
          for (let x = 3; x < GAME_WIDTH; x += 12) {
            ctx.fillRect(x, laneY + 8, 2, 10);
            ctx.fillRect(x + 4, laneY + 12, 2, 12);
          }
          ctx.fillStyle = '#4a9a42';
          for (let x = 8; x < GAME_WIDTH; x += 18) {
            ctx.fillRect(x, laneY + 6, 1, 8);
            ctx.fillRect(x + 6, laneY + 14, 2, 8);
          }
          // Small flowers/details
          ctx.fillStyle = '#6ab052';
          for (let x = 15; x < GAME_WIDTH; x += 35) {
            ctx.fillRect(x, laneY + 18, 3, 3);
          }
          // Border line between grass and road (top of safe zone)
          ctx.fillStyle = '#2d5a27';
          ctx.fillRect(0, laneY, GAME_WIDTH, 2);
          ctx.fillRect(0, laneY + TILE_SIZE - 2, GAME_WIDTH, 2);
          break;
        case 'home':
          ctx.fillStyle = COLORS.water;
          ctx.fillRect(0, laneY, GAME_WIDTH, TILE_SIZE);
          break;
      }
    });

    // Draw water sparkles (pixel effect)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    sparklesRef.current.forEach(sparkle => {
      const alpha = sparkle.life / sparkle.maxLife;
      ctx.globalAlpha = alpha * 0.8;
      // Draw as small pixel cluster
      ctx.fillRect(Math.floor(sparkle.x), Math.floor(sparkle.y), 2, 1);
      ctx.fillRect(Math.floor(sparkle.x) + 1, Math.floor(sparkle.y) + 1, 1, 1);
    });
    ctx.globalAlpha = 1.0;

    // Draw home spots (lily pads) - larger and more detailed with varying colors
    homeSpots.forEach((spot, index) => {
      const centerX = spot.x + 20;
      const centerY = 20;
      const colors = LILYPAD_COLORS[index % LILYPAD_COLORS.length];
      const padW = 38; // Larger width
      const padH = 30; // Larger height
      
      if (spot.filled) {
        // Filled lily pad with frog
        // Pad base
        ctx.fillStyle = colors.base;
        ctx.fillRect(centerX - padW / 2, centerY - padH / 2, padW, padH);
        // Outer rim highlight
        ctx.fillStyle = colors.highlight;
        ctx.fillRect(centerX - padW / 2 + 2, centerY - padH / 2, padW - 4, 3);
        // V notch
        ctx.fillStyle = COLORS.water;
        ctx.fillRect(centerX - 3, centerY - padH / 2, 6, 10);
        // Vein lines
        ctx.fillStyle = colors.texture;
        ctx.fillRect(centerX - 14, centerY - 4, 10, 2);
        ctx.fillRect(centerX + 4, centerY - 4, 10, 2);
        ctx.fillRect(centerX - 10, centerY + 4, 8, 2);
        ctx.fillRect(centerX + 2, centerY + 4, 8, 2);
        // Mini frog sitting on pad
        ctx.fillStyle = COLORS.player;
        ctx.fillRect(centerX - 7, centerY - 5, 14, 12);
        ctx.fillStyle = '#5a9e45';
        ctx.fillRect(centerX - 5, centerY - 7, 4, 4);
        ctx.fillRect(centerX + 1, centerY - 7, 4, 4);
        // Frog eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(centerX - 4, centerY - 6, 2, 2);
        ctx.fillRect(centerX + 2, centerY - 6, 2, 2);
      } else {
        // Empty lily pad
        ctx.fillStyle = colors.base;
        ctx.fillRect(centerX - padW / 2, centerY - padH / 2, padW, padH);
        // Outer rim highlight
        ctx.fillStyle = colors.highlight;
        ctx.fillRect(centerX - padW / 2 + 2, centerY - padH / 2, padW - 4, 3);
        ctx.fillRect(centerX - padW / 2, centerY - padH / 2 + 3, 3, padH - 6);
        // V notch
        ctx.fillStyle = COLORS.water;
        ctx.fillRect(centerX - 3, centerY - padH / 2, 6, 10);
        // Vein pattern
        ctx.fillStyle = colors.texture;
        ctx.fillRect(centerX - 14, centerY - 4, 10, 2);
        ctx.fillRect(centerX + 4, centerY - 4, 10, 2);
        ctx.fillRect(centerX - 10, centerY + 4, 8, 2);
        ctx.fillRect(centerX + 2, centerY + 4, 8, 2);
        // Center vein
        ctx.fillRect(centerX - 1, centerY - 2, 2, 10);
        // Small water droplets on pad
        ctx.fillStyle = '#4fc3f7';
        ctx.fillRect(centerX - 8, centerY + 6, 2, 2);
        ctx.fillRect(centerX + 10, centerY - 2, 2, 2);
      }
    });

    // Draw lane objects
    lanes.forEach(lane => {
      lane.objects.forEach(obj => {
        const colorVariant = obj.colorVariant || 0;
        
        // Check if this is a vehicle that should be scaled (not motorcycle, not water objects)
        const isScaledVehicle = ['car-small', 'car', 'car-wide', 'truck', 'truck-long'].includes(obj.type);
        
        let x = Math.round(obj.x);
        let y = Math.round(obj.y) + 2;
        const h = obj.height;
        const w = obj.width;

        ctx.save();
        
        if (isScaledVehicle) {
          // Scale down by 15% and center in the original space
          const scaledW = w * VEHICLE_SCALE;
          const scaledH = h * VEHICLE_SCALE;
          const offsetX = (w - scaledW) / 2;
          const offsetY = (h - scaledH) / 2;
          
          ctx.translate(x + offsetX, y + offsetY);
          ctx.scale(VEHICLE_SCALE, VEHICLE_SCALE);
          x = 0;
          y = 0;
        }
        
        switch (obj.type) {
          case 'motorcycle': {
            // Detailed pixel motorcycle
            const motoColors = ['#424242', '#616161', '#757575', '#5d4037'];
            ctx.fillStyle = motoColors[colorVariant % motoColors.length];
            // Frame
            ctx.fillRect(x + 6, y + 14, obj.width - 12, h - 28);
            // Engine block
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x + 8, y + 16, 6, 6);
            // Wheels
            ctx.fillRect(x + 2, y + h / 2 - 4, 6, 8);
            ctx.fillRect(x + obj.width - 8, y + h / 2 - 4, 6, 8);
            // Wheel spokes
            ctx.fillStyle = '#666666';
            ctx.fillRect(x + 4, y + h / 2 - 1, 2, 2);
            ctx.fillRect(x + obj.width - 6, y + h / 2 - 1, 2, 2);
            // Rider
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x + 10, y + 8, 6, 10);
            // Helmet
            ctx.fillStyle = ['#ffeb3b', '#e91e63', '#00bcd4', '#ff5722'][colorVariant % 4];
            ctx.fillRect(x + 10, y + 4, 6, 6);
            break;
          }

          case 'car-small': {
            // Detailed pixel compact car
            const smallCarColors = ['#9c27b0', '#00bcd4', '#4caf50', '#ff5722'];
            ctx.fillStyle = smallCarColors[colorVariant % smallCarColors.length];
            // Body
            ctx.fillRect(x + 2, y + 8, w - 4, h - 16);
            // Roof (darker)
            ctx.fillStyle = ['#7b1fa2', '#0097a7', '#388e3c', '#e64a19'][colorVariant % 4];
            ctx.fillRect(x + 8, y + 12, w - 16, h - 24);
            // Windows
            ctx.fillStyle = '#87ceeb';
            ctx.fillRect(x + 10, y + 14, 6, h - 28);
            ctx.fillRect(x + 20, y + 14, 6, h - 28);
            // Headlights
            ctx.fillStyle = '#ffff99';
            ctx.fillRect(x + w - 4, y + 12, 2, 4);
            ctx.fillRect(x + w - 4, y + h - 16, 2, 4);
            // Taillights
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(x + 2, y + 12, 2, 4);
            ctx.fillRect(x + 2, y + h - 16, 2, 4);
            // Wheels
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x + 6, y + 4, 6, 4);
            ctx.fillRect(x + 6, y + h - 8, 6, 4);
            ctx.fillRect(x + w - 12, y + 4, 6, 4);
            ctx.fillRect(x + w - 12, y + h - 8, 6, 4);
            break;
          }

          case 'car': {
            // Standard detailed car
            const carColors = [COLORS.car1, COLORS.car2, '#8bc34a', '#ff9800'];
            ctx.fillStyle = carColors[colorVariant % carColors.length];
            // Body
            ctx.fillRect(x + 2, y + 6, w - 4, h - 12);
            // Roof
            ctx.fillStyle = ['#c62828', '#1565c0', '#689f38', '#ef6c00'][colorVariant % 4];
            ctx.fillRect(x + 12, y + 10, w - 24, h - 20);
            // Windows
            ctx.fillStyle = '#87ceeb';
            ctx.fillRect(x + 14, y + 12, 10, h - 24);
            ctx.fillRect(x + 28, y + 12, 8, h - 24);
            // Front bumper detail
            ctx.fillStyle = '#424242';
            ctx.fillRect(x + w - 6, y + 8, 4, h - 16);
            // Headlights
            ctx.fillStyle = '#ffff99';
            ctx.fillRect(x + w - 4, y + 10, 2, 4);
            ctx.fillRect(x + w - 4, y + h - 14, 2, 4);
            // Taillights
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(x + 2, y + 10, 2, 4);
            ctx.fillRect(x + 2, y + h - 14, 2, 4);
            // Wheels
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x + 6, y + 2, 8, 5);
            ctx.fillRect(x + 6, y + h - 7, 8, 5);
            ctx.fillRect(x + w - 14, y + 2, 8, 5);
            ctx.fillRect(x + w - 14, y + h - 7, 8, 5);
            // Hubcaps
            ctx.fillStyle = '#888888';
            ctx.fillRect(x + 8, y + 3, 4, 3);
            ctx.fillRect(x + 8, y + h - 6, 4, 3);
            break;
          }

          case 'car-wide': {
            // Wide SUV/van with detail
            const wideCarColors = ['#795548', '#607d8b', '#3f51b5', '#009688'];
            ctx.fillStyle = wideCarColors[colorVariant % wideCarColors.length];
            // Body
            ctx.fillRect(x + 2, y + 4, w - 4, h - 8);
            // Roof rack
            ctx.fillStyle = '#424242';
            ctx.fillRect(x + 12, y + 2, w - 24, 3);
            // Windows
            ctx.fillStyle = '#87ceeb';
            ctx.fillRect(x + 10, y + 8, 14, h - 16);
            ctx.fillRect(x + 28, y + 8, 14, h - 16);
            ctx.fillRect(x + 46, y + 8, 14, h - 16);
            // Window frames
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x + 24, y + 8, 4, h - 16);
            ctx.fillRect(x + 42, y + 8, 4, h - 16);
            // Headlights
            ctx.fillStyle = '#ffff99';
            ctx.fillRect(x + w - 4, y + 8, 2, 6);
            ctx.fillRect(x + w - 4, y + h - 14, 2, 6);
            // Taillights
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(x + 2, y + 8, 2, 6);
            ctx.fillRect(x + 2, y + h - 14, 2, 6);
            // Wheels
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x + 8, y, 10, 5);
            ctx.fillRect(x + 8, y + h - 5, 10, 5);
            ctx.fillRect(x + w - 18, y, 10, 5);
            ctx.fillRect(x + w - 18, y + h - 5, 10, 5);
            break;
          }

          case 'truck': {
            // Detailed truck
            // Cab
            ctx.fillStyle = COLORS.truck;
            ctx.fillRect(x + 2, y + 4, 22, h - 8);
            // Cab window
            ctx.fillStyle = '#87ceeb';
            ctx.fillRect(x + 6, y + 8, 10, h - 18);
            // Cargo
            ctx.fillStyle = '#d4a853';
            ctx.fillRect(x + 24, y + 2, w - 26, h - 4);
            // Cargo detail lines
            ctx.fillStyle = '#c49843';
            ctx.fillRect(x + 34, y + 4, 2, h - 8);
            ctx.fillRect(x + 50, y + 4, 2, h - 8);
            ctx.fillRect(x + 66, y + 4, 2, h - 8);
            // Headlight
            ctx.fillStyle = '#ffff99';
            ctx.fillRect(x + w - 4, y + 10, 2, 4);
            ctx.fillRect(x + w - 4, y + h - 14, 2, 4);
            // Taillight
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(x + 2, y + 10, 2, 4);
            ctx.fillRect(x + 2, y + h - 14, 2, 4);
            // Wheels
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x + 6, y, 10, 5);
            ctx.fillRect(x + 6, y + h - 5, 10, 5);
            ctx.fillRect(x + w - 18, y, 10, 5);
            ctx.fillRect(x + w - 18, y + h - 5, 10, 5);
            break;
          }

          case 'truck-long': {
            // Long semi truck with detail
            // Cab
            ctx.fillStyle = '#c62828';
            ctx.fillRect(x + 2, y + 4, 26, h - 8);
            // Cab detail
            ctx.fillStyle = '#b71c1c';
            ctx.fillRect(x + 4, y + 6, 10, h - 12);
            // Cab windows
            ctx.fillStyle = '#87ceeb';
            ctx.fillRect(x + 6, y + 8, 6, h - 18);
            // Trailer
            ctx.fillStyle = '#37474f';
            ctx.fillRect(x + 28, y, w - 30, h);
            // Trailer stripes
            ctx.fillStyle = '#546e7a';
            for (let stripe = 0; stripe < 4; stripe++) {
              ctx.fillRect(x + 38 + stripe * 22, y + 3, 12, h - 6);
            }
            // Trailer rivets
            ctx.fillStyle = '#263238';
            for (let rivet = 0; rivet < 6; rivet++) {
              ctx.fillRect(x + 32 + rivet * 15, y + 2, 2, 2);
              ctx.fillRect(x + 32 + rivet * 15, y + h - 4, 2, 2);
            }
            // Headlight
            ctx.fillStyle = '#ffff99';
            ctx.fillRect(x + w - 4, y + 8, 2, 4);
            ctx.fillRect(x + w - 4, y + h - 12, 2, 4);
            // Wheels (more for long truck)
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x + 8, y, 10, 5);
            ctx.fillRect(x + 8, y + h - 5, 10, 5);
            ctx.fillRect(x + 48, y, 10, 5);
            ctx.fillRect(x + 48, y + h - 5, 10, 5);
            ctx.fillRect(x + w - 22, y, 10, 5);
            ctx.fillRect(x + w - 22, y + h - 5, 10, 5);
            break;
          }

          case 'log-short':
          case 'log-medium':
          case 'log-long': {
            // Highly detailed pixel log
            // Main bark base
            ctx.fillStyle = '#7d5e4e';
            ctx.fillRect(x + 2, y + 5, obj.width - 4, h - 10);
            // Lighter bark center
            ctx.fillStyle = COLORS.log;
            ctx.fillRect(x + 4, y + 7, obj.width - 8, h - 14);
            // Darker bark edges (shadow)
            ctx.fillStyle = '#5d4a3e';
            ctx.fillRect(x, y + 8, 3, h - 16);
            ctx.fillRect(x + obj.width - 3, y + 8, 3, h - 16);
            // Log ends (tree rings effect) - left end
            ctx.fillStyle = '#a08878';
            ctx.fillRect(x, y + 8, 6, h - 16);
            ctx.fillStyle = '#8d7a6e';
            ctx.fillRect(x + 1, y + 10, 4, h - 20);
            ctx.fillStyle = '#c4a888';
            ctx.fillRect(x + 2, y + 12, 2, h - 24);
            // Tree rings detail - left
            ctx.fillStyle = '#6d5a4e';
            ctx.fillRect(x + 2, y + 14, 1, h - 28);
            // Log ends - right end
            ctx.fillStyle = '#a08878';
            ctx.fillRect(x + obj.width - 6, y + 8, 6, h - 16);
            ctx.fillStyle = '#8d7a6e';
            ctx.fillRect(x + obj.width - 5, y + 10, 4, h - 20);
            ctx.fillStyle = '#c4a888';
            ctx.fillRect(x + obj.width - 4, y + 12, 2, h - 24);
            // Tree rings detail - right
            ctx.fillStyle = '#6d5a4e';
            ctx.fillRect(x + obj.width - 3, y + 14, 1, h - 28);
            // Bark texture (pixel knots and grain)
            ctx.fillStyle = '#6d5a4e';
            for (let lx = x + 14; lx < x + obj.width - 14; lx += 16) {
              // Knot holes
              ctx.fillRect(lx, y + 9, 4, 3);
              ctx.fillRect(lx + 7, y + h - 13, 4, 3);
              // Grain lines
              ctx.fillRect(lx + 3, y + 14, 1, 6);
              ctx.fillRect(lx + 10, y + 16, 1, 5);
            }
            // Top bark texture detail
            ctx.fillStyle = '#9d8878';
            for (let lx = x + 10; lx < x + obj.width - 10; lx += 12) {
              ctx.fillRect(lx, y + 6, 6, 1);
            }
            // Bottom bark texture
            ctx.fillStyle = '#5d4a3e';
            for (let lx = x + 8; lx < x + obj.width - 8; lx += 14) {
              ctx.fillRect(lx, y + h - 7, 8, 1);
            }
            // Moss patches on log
            ctx.fillStyle = '#4a6a3a';
            ctx.fillRect(x + 20, y + 8, 4, 3);
            if (obj.width > 100) {
              ctx.fillRect(x + 60, y + h - 11, 5, 3);
            }
            if (obj.width > 140) {
              ctx.fillRect(x + 110, y + 10, 4, 2);
            }
            // Highlight along top edge
            ctx.fillStyle = '#b09888';
            ctx.fillRect(x + 8, y + 5, obj.width - 16, 1);
            break;
          }

          case 'turtle': {
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
                diveProgress = obj.diveTimer ? obj.diveTimer / 800 : 0;
                opacity = 0.3 + ((1 - diveProgress) * 0.7);
                yOffset = diveProgress * 6;
                scale = 0.7 + ((1 - diveProgress) * 0.3);
                break;
            }
            
            ctx.globalAlpha = opacity;
            
            for (let i = 0; i < turtleCount; i++) {
              const tx = x + i * turtleSpacing + 5;
              const tcx = tx + 12;
              const tcy = y + h / 2 + yOffset;
              const shellW = Math.round(20 * scale);
              const shellH = Math.round(16 * scale);
              
              // Shell base
              ctx.fillStyle = divePhase === 'submerged' ? '#2d5a5a' : '#2e7d32';
              ctx.fillRect(tcx - shellW / 2, tcy - shellH / 2, shellW, shellH);
              
              if (divePhase === 'surface' || divePhase === 'rising') {
                // Shell pattern (hexagonal-ish)
                ctx.fillStyle = '#388e3c';
                ctx.fillRect(tcx - shellW / 2 + 2, tcy - shellH / 2 + 2, shellW - 4, shellH - 4);
                // Pattern details
                ctx.fillStyle = '#43a047';
                ctx.fillRect(tcx - 4, tcy - 3, 8, 6);
                ctx.fillRect(tcx - 6, tcy - 1, 4, 2);
                ctx.fillRect(tcx + 2, tcy - 1, 4, 2);
                // Shell edge highlights
                ctx.fillStyle = '#4caf50';
                ctx.fillRect(tcx - shellW / 2 + 2, tcy - shellH / 2, shellW - 4, 2);
                
                // Head
                ctx.fillStyle = '#66bb6a';
                const headSize = Math.round(6 * scale);
                ctx.fillRect(tcx + shellW / 2 - 2, tcy - headSize / 2, headSize, headSize);
                // Eyes
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(tcx + shellW / 2 + 2, tcy - 2, 2, 2);
                ctx.fillRect(tcx + shellW / 2 + 2, tcy, 2, 2);
                
                // Flippers
                ctx.fillStyle = '#4caf50';
                const flipperSize = Math.round(5 * scale);
                // Front flippers
                ctx.fillRect(tcx - 2, tcy - shellH / 2 - flipperSize + 2, flipperSize, flipperSize);
                ctx.fillRect(tcx - 2, tcy + shellH / 2 - 2, flipperSize, flipperSize);
                // Back flippers
                ctx.fillRect(tcx - shellW / 2, tcy - 3, 4, 6);
              }
            }
            
            ctx.globalAlpha = 1.0;
            break;
          }
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
        // Pixel heart for extra life
        ctx.fillStyle = '#e91e63';
        const hx = Math.floor(puX + 7);
        const hy = Math.floor(puY + 5 + pulse);
        // Heart shape in pixels
        ctx.fillRect(hx + 2, hy, 4, 2);
        ctx.fillRect(hx + 10, hy, 4, 2);
        ctx.fillRect(hx, hy + 2, 8, 2);
        ctx.fillRect(hx + 8, hy + 2, 8, 2);
        ctx.fillRect(hx, hy + 4, 16, 2);
        ctx.fillRect(hx + 2, hy + 6, 12, 2);
        ctx.fillRect(hx + 4, hy + 8, 8, 2);
        ctx.fillRect(hx + 6, hy + 10, 4, 2);
        // Highlight
        ctx.fillStyle = '#f48fb1';
        ctx.fillRect(hx + 3, hy + 2, 2, 2);
      } else {
        // Pixel star for invincibility
        ctx.fillStyle = '#ffd700';
        const sx = Math.floor(puX + 7);
        const sy = Math.floor(puY + 5 + pulse);
        // Star shape in pixels
        ctx.fillRect(sx + 6, sy, 4, 4);
        ctx.fillRect(sx + 4, sy + 4, 8, 2);
        ctx.fillRect(sx, sy + 6, 16, 4);
        ctx.fillRect(sx + 2, sy + 10, 4, 2);
        ctx.fillRect(sx + 10, sy + 10, 4, 2);
        ctx.fillRect(sx + 2, sy + 12, 2, 2);
        ctx.fillRect(sx + 12, sy + 12, 2, 2);
        // Highlight
        ctx.fillStyle = '#ffeb3b';
        ctx.fillRect(sx + 7, sy + 2, 2, 2);
      }
      
      ctx.restore();
    }

    // Draw player (frog) - 8% smaller with idle animation
    const px = Math.round(player.x + FROG_OFFSET);
    const py = Math.round(player.y + FROG_OFFSET);
    const fs = FROG_SIZE;
    
    // Idle animation: subtle breathing every few frames
    const breathFrame = Math.floor(frame / 12) % 4;
    const breathOffset = breathFrame === 1 || breathFrame === 2 ? 1 : 0;
    const eyeBlink = frame % 60 < 3; // Blink every 60 frames

    ctx.save();
    
    // Invincibility glow effect
    if (isInvincible) {
      const glowPulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 15 * glowPulse;
    }
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(px + 2, py + fs - 2, fs - 4, 4);

    // Body
    ctx.fillStyle = isInvincible ? '#ffd700' : COLORS.player;
    ctx.fillRect(px + 4, py + 8 - breathOffset, fs - 8, fs - 12 + breathOffset);
    
    // Head
    ctx.fillRect(px + 6, py + 2, fs - 12, 8);
    
    // Eyes
    if (eyeBlink) {
      // Closed eyes
      ctx.fillStyle = '#4a8e35';
      ctx.fillRect(px + 5, py + 2, 6, 2);
      ctx.fillRect(px + fs - 11, py + 2, 6, 2);
    } else {
      // Open eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px + 5, py, 7, 7);
      ctx.fillRect(px + fs - 12, py, 7, 7);
      // Pupils
      ctx.fillStyle = '#000000';
      ctx.fillRect(px + 8, py + 2, 3, 4);
      ctx.fillRect(px + fs - 10, py + 2, 3, 4);
    }

    // Spots on body
    ctx.fillStyle = '#5a9e45';
    ctx.fillRect(px + 8, py + 12, 4, 4);
    ctx.fillRect(px + fs - 12, py + 14, 4, 4);

    // Front legs
    ctx.fillStyle = '#5a9e45';
    ctx.fillRect(px, py + 10, 5, 7);
    ctx.fillRect(px + fs - 5, py + 10, 5, 7);

    // Back legs
    ctx.fillRect(px - 3, py + fs - 10, 8, 10);
    ctx.fillRect(px + fs - 5, py + fs - 10, 8, 10);

    // Feet
    ctx.fillStyle = '#4a8e35';
    ctx.fillRect(px - 4, py + fs - 2, 10, 3);
    ctx.fillRect(px + fs - 6, py + fs - 2, 10, 3);
    // Toe detail
    ctx.fillStyle = '#3d7a32';
    ctx.fillRect(px - 4, py + fs - 2, 2, 2);
    ctx.fillRect(px, py + fs - 2, 2, 2);
    ctx.fillRect(px + 4, py + fs - 2, 2, 2);
    ctx.fillRect(px + fs - 6, py + fs - 2, 2, 2);
    ctx.fillRect(px + fs - 2, py + fs - 2, 2, 2);
    ctx.fillRect(px + fs + 2, py + fs - 2, 2, 2);

    ctx.restore();

    // Draw death effect
    if (deathEffect) {
      deathFrameRef.current++;
      const dFrame = deathFrameRef.current;
      const cx = deathEffect.x + PLAYER_SIZE / 2;
      const cy = deathEffect.y + PLAYER_SIZE / 2;
      
      if (deathEffect.type === 'splash') {
        // Draw sinking frog first (before particles)
        const sinkProgress = Math.min(dFrame / 20, 1);
        if (sinkProgress < 1) {
          ctx.globalAlpha = 1 - sinkProgress;
          // Frog sinking into water
          const sinkY = cy - 10 + sinkProgress * 15;
          ctx.fillStyle = '#5a8a4a';
          ctx.fillRect(cx - 10, sinkY, 20, 14 * (1 - sinkProgress * 0.5));
          // Eyes going under
          if (sinkProgress < 0.6) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 8, sinkY - 4, 5, 4);
            ctx.fillRect(cx + 3, sinkY - 4, 5, 4);
          }
        }
        
        // Water splash particles - CIRCLES
        deathEffect.particles.forEach((p) => {
          const age = dFrame * 0.08;
          const px = p.x + p.vx * age;
          const py = p.y + p.vy * age + age * age * 0.5;
          const alpha = Math.max(0, 1 - age / 12);
          const radius = (p.size / 2) * Math.max(0.3, 1 - age / 15);
          
          if (alpha > 0 && radius > 0) {
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(px, py, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        
        // Expanding ripple rings - CIRCLES
        for (let ring = 0; ring < 3; ring++) {
          const rippleAge = (dFrame - ring * 8) * 0.06;
          if (rippleAge > 0 && rippleAge < 4) {
            ctx.globalAlpha = Math.max(0, 0.7 - rippleAge * 0.18);
            ctx.strokeStyle = '#81d4fa';
            ctx.lineWidth = Math.max(1, 3 - rippleAge);
            const rippleRadius = 8 + rippleAge * 18;
            ctx.beginPath();
            ctx.arc(cx, cy, rippleRadius, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        
        // Bubbles rising - CIRCLES
        if (dFrame > 10 && dFrame < 50) {
          ctx.fillStyle = '#e1f5fe';
          for (let b = 0; b < 5; b++) {
            const bubbleY = cy - ((dFrame - 10) * 1.5) - b * 7;
            const bubbleX = cx + Math.sin(dFrame * 0.3 + b) * 6 + (b - 2) * 5;
            const bubbleAlpha = Math.max(0, 1 - (dFrame - 10) / 40);
            ctx.globalAlpha = bubbleAlpha * 0.7;
            ctx.beginPath();
            ctx.arc(bubbleX, bubbleY, 2 + (b % 2), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        // Car crash - squished frog and blood splat
        const age = dFrame * 0.06; // Slower animation
        
        // Initial impact flash
        if (dFrame < 4) {
          ctx.globalAlpha = 1 - dFrame / 4;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cx - 20, cy - 20, 40, 40);
        }
        
        // Blood splat particles spreading outward
        deathEffect.particles.forEach((p) => {
          const px = p.x + p.vx * age * 1.5;
          const py = p.y + p.vy * age;
          const alpha = Math.max(0, 1 - age / 15);
          const size = p.size * (0.8 + age * 0.1); // Particles grow slightly
          
          if (alpha > 0) {
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(Math.floor(px), Math.floor(py), Math.ceil(size), Math.ceil(size));
          }
        });
        
        // Squished frog remains (stays visible longer)
        if (age < 12) {
          ctx.globalAlpha = Math.max(0, 1 - age / 12);
          
          // Blood pool expanding
          const poolSize = 10 + age * 3;
          ctx.fillStyle = '#8b0000';
          ctx.fillRect(cx - poolSize, cy - poolSize / 3, poolSize * 2, poolSize * 0.7);
          
          // Flattened frog body
          ctx.fillStyle = '#4a6a3a';
          ctx.fillRect(cx - 12, cy - 3, 24, 6);
          
          // Splayed legs
          ctx.fillStyle = '#3d5a32';
          ctx.fillRect(cx - 18, cy - 1, 6, 3);
          ctx.fillRect(cx + 12, cy - 1, 6, 3);
          ctx.fillRect(cx - 16, cy + 4, 5, 3);
          ctx.fillRect(cx + 11, cy + 4, 5, 3);
          
          // X eyes (dead)
          ctx.fillStyle = '#000000';
          // Left X
          ctx.fillRect(cx - 8, cy - 2, 1, 3);
          ctx.fillRect(cx - 6, cy - 2, 1, 3);
          ctx.fillRect(cx - 7, cy - 1, 1, 1);
          // Right X
          ctx.fillRect(cx + 5, cy - 2, 1, 3);
          ctx.fillRect(cx + 7, cy - 2, 1, 3);
          ctx.fillRect(cx + 6, cy - 1, 1, 1);
        }
      }
      
      ctx.globalAlpha = 1.0;
    } else {
      deathFrameRef.current = 0;
    }

  }, [player, lanes, homeSpots, level, powerUp, isInvincible, deathEffect]);

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