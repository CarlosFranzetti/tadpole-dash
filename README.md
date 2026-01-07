# Tadpole

Classic Frogger-style browser game: hop across roads and rivers, collect powerups, and fill homes. Built with TypeScript + React + Vite.

## Quick start

Requirements: Node.js and npm (nvm recommended).

```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Development server
npm run dev

# Build & preview
npm run build
npm run preview

# Lint
npm run lint
```

## How to contribute / edit locally

- Edit files in `src/*`. Pages live in `src/pages`, game logic in `src/hooks/useGameLogic.ts`, and UI in `src/components`.
- Routes are lazy-loaded in `src/App.tsx` using Suspense — add new routes there and keep the catch-all `*` route at the bottom.

## Sharing / posts

When sharing the project (social posts, screenshots, or text messages), please include a screenshot of the game's title screen as the image. To capture it:

- Run the dev server (`npm run dev`) and open the app at `/`.
- Wait on the title screen and take a screenshot (the component lives at `src/components/game/TitleScreen.tsx`).
- Use that screenshot as the preview image for any posts or messages about the project.

For link previews, replace `public/og-image.png` with the title-screen screenshot so social/text previews use it.

## What technologies are used for this project?

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

If you need help reproducing a specific behavior (audio, physics, or high score persistence), add a short note in your issue and include the title-screen screenshot when relevant.
