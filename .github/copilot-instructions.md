<!-- .github/copilot-instructions.md -->
# Copilot / Agent instructions — tadpole-dash

Short, actionable notes to help AI coding agents be productive in this repository.

- Project: a small browser game built with Vite + React + TypeScript, using shadcn-ui + Tailwind.
- Runtime: client-only (no backend). High scores persist in `localStorage`.

Quick start
- Install: `npm install`
- Dev server: `npm run dev` (Vite)
- Build: `npm run build` (production) or `npm run build:dev` (development build)
- Preview production build: `npm run preview`
- Lint: `npm run lint`

High-level architecture (what to edit where)
- Pages & routes: `src/pages/*` (index is `src/pages/Index.tsx`). Routes are lazy-loaded in `src/App.tsx` using Suspense.
- Game logic: `src/hooks/useGameLogic.ts` — the main game loop (requestAnimationFrame), collision detection, level progression, and spawn logic live here.
- Rendering: `src/components/game/*` — canvas, HUD, title/over screens, and visual helpers.
- Sound: `src/hooks/useSoundEffects.ts` — uses the Web Audio API (oscillators). Music is started/stopped on user gesture (see `startMusic` usage in `Index.tsx`).
- High scores: `src/hooks/useHighScores.ts` — client-only; key: `tadpole-high-scores` in `localStorage`.
- Constants & types: `src/lib/gameConstants.ts`, `src/lib/gameTypes.ts`.
- UI components: `src/components/ui/*` (shadcn-style components & utilities).

Important conventions & gotchas
- Imports use path alias `@/*` (configured in `tsconfig.json`). Use `@/` for same-repo imports.
- The game loop keeps mutable state in refs (e.g., `lanesRef`, `playerRef`) for performance and to avoid excessive renders — follow this pattern for performance-sensitive code.
- Audio playback uses the Web Audio API and requires a user interaction to start in many browsers — the project already calls `startMusic()` after the player starts the game.
- High scores are persisted to `localStorage`. Changing the stored shape or key (`tadpole-high-scores`) needs migration logic in `useHighScores`.
- Visual & timing decisions intentionally tuned for an 8-bit feel (pixel-snapped movement, fixed durations) — see `TILE_SIZE`, `GAME_WIDTH` and `DIVE_PHASES` in `useGameLogic` & `gameConstants.ts`.
- Tailwind theme variables are defined in `src/index.css`. Colors are HSL-based variables at the top of that file.

Developer workflows & debugging tips
- There are no unit tests in the repo. When adding tests, prefer extracting deterministic, pure helpers (e.g., lane/object generators in `useGameLogic`) and unit-testing them.
- To reproduce audio issues, run locally and ensure a user gesture triggers `startMusic()` (e.g., click Start). Use the console to catch audio-related errors (try/catch is used in `useSoundEffects`).
- Inspect/change behavior by adding short console logs or breakpoints inside `useGameLogic`'s game loop; avoid heavy work inside the loop — prefer precomputations or ref storage.
- Use browser devtools to inspect `localStorage['tadpole-high-scores']` when testing persistence.

PR/feature guidance for agents
- When modifying gameplay, update/verify both `useGameLogic.ts` and visual components in `src/components/game`.
- Keep changes small and focused. The game loop is delicate: avoid adding synchronous blocking work and prefer pure ref-based calculations for performance.
- Maintain the pixel-art feel: be cautious changing `TILE_SIZE`, movement speeds, and timing constants without playtesting.

Examples (quick references)
- Start game flow: `src/pages/Index.tsx` calls `startGame()` (which is defined in `useGameLogic`) and then `startMusic()` from `useSoundEffects`.
- Persistent data: `src/hooks/useHighScores.ts` reads/writes `localStorage` key `tadpole-high-scores`.
- Performance pattern: `useGameLogic` uses `requestAnimationFrame`, `lanesRef`, and `playerRef` to keep the RAF loop efficient.

If anything above is ambiguous or you want more detail on a specific area (testing, refactoring suggestions, or architecture diagram), say which part to expand and I will iterate.
