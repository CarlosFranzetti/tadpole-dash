# Tadpole Dash - Project Overview

A "vibecoded" retro-style arcade game inspired by *Frogger*, built with modern web technologies. This project features a custom 2D canvas game engine integrated into a React application, complete with 8-bit sound effects, procedural art, and CRT visual filters.

## Tech Stack

- **Framework:** React 18 (TypeScript)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS + shadcn-ui
- **Animations:** Framer Motion
- **Game Engine:** Custom 2D Canvas API engine (managed via `useGameLogic` hook)
- **Audio:** Web Audio API (procedural 8-bit sounds)
- **State Management:** React Hooks
- **Linting:** ESLint

## Project Structure

- `src/components/game/`: Core game UI components.
    - `GameCanvas.tsx`: The primary rendering surface.
    - `GameHUD.tsx`: Heads-up display (lives, score, level).
    - `TitleScreen.tsx`: Initial game entry screen.
    - `GameOverScreen.tsx`: End-of-game stats and restart option.
- `src/hooks/`: Core game logic and interactions.
    - `useGameLogic.ts`: **The Heart of the Game.** Manages state transitions, collision detection, movement logic, and the game loop.
    - `useSoundEffects.ts`: Synthesis-based audio logic.
    - `useSwipeControls.ts`: Mobile-specific input handling.
    - `useHighScores.ts`: Local storage persistence for leaderboards.
- `src/lib/`:
    - `gameConstants.ts`: Global configuration (speeds, colors, lane types).
    - `gameTypes.ts`: TypeScript interfaces for game entities (Tadpole, Obstacle, Lane).
- `src/pages/`:
    - `Index.tsx`: Main game page.

## Game Features

- **Procedural Logic:** Lanes and obstacles are generated and managed based on level difficulty.
- **Dynamic Input:** Supports seamless switching between keyboard (Arrow keys) and mobile (Swipes).
- **Vibe Elements:** Screen shake on collisions, CRT scanline overlays, and responsive animations.
- **High Score System:** Persistence of local high scores to encourage replayability.

## Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Building for Production
```bash
npm run build
```

### Linting
```bash
npm run lint
```

## Development Conventions

- **State Management:** Keep the core game loop and state updates within `useGameLogic.ts`. Avoid spreading physics logic across multiple components.
- **Performance:** Ensure the game loop remains performant. Be careful with React state updates inside high-frequency frames; prefer refs or localized state for rendering optimizations if needed.
- **UI:** Use shadcn-ui for non-canvas elements to maintain a consistent, modern design language.
- **Vibecoding:** Prioritize game "feel." If a mechanic feels static, add a subtle animation or sound effect to increase impact.
- **Asset Leanliness:** Avoid external images or audio files when possible. Use code to draw sprites and synthesize sounds.

---

**Los Retro Remix Roundups** — *Bringing the arcade back, one quarter at a time. 🪙👾*
