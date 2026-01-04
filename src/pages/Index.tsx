import { useState, useCallback, useEffect } from 'react';
import { GameState, SwipeDirection } from '@/lib/gameTypes';
import { TitleScreen } from '@/components/game/TitleScreen';
import { GameCanvas } from '@/components/game/GameCanvas';
import { GameHUD } from '@/components/game/GameHUD';
import { GameOverScreen } from '@/components/game/GameOverScreen';
import { HighScoreTable } from '@/components/game/HighScoreTable';
import { SwipeIndicator } from '@/components/game/SwipeIndicator';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useSwipeControls } from '@/hooks/useSwipeControls';
import { useHighScores } from '@/hooks/useHighScores';
import { useSoundEffects } from '@/hooks/useSoundEffects';

const Index = () => {
  const [gameState, setGameState] = useState<GameState>('title');
  const [lastSwipe, setLastSwipe] = useState<SwipeDirection>(null);
  const [shakeFrame, setShakeFrame] = useState(0);
  const { highScores, addHighScore, isHighScore } = useHighScores();
  const { player, lanes, homeSpots, level, isGameOver, powerUp, isInvincible, deathEffect, startGame, continueGame, continuesRemaining, movePlayer } = useGameLogic();
  const { startMusic, stopMusic, playSound } = useSoundEffects();

  const handleStartGame = useCallback(() => {
    setGameState('playing');
    startGame();
    startMusic();
  }, [startGame, startMusic]);

  // 8-bit style screen shake - snaps to pixel grid
  useEffect(() => {
    if (deathEffect) {
      const interval = setInterval(() => {
        setShakeFrame(f => f + 1);
      }, 50); // Update every 50ms for chunky 8-bit feel
      return () => clearInterval(interval);
    } else {
      setShakeFrame(0);
    }
  }, [deathEffect]);

  // Play sounds on game events
  useEffect(() => {
    if (isGameOver) {
      stopMusic();
      playSound('gameover');
    }
  }, [isGameOver, stopMusic, playSound]);

  const handleSwipe = useCallback((direction: SwipeDirection) => {
    if (gameState === 'playing' && direction) {
      setLastSwipe(direction);
      movePlayer(direction);
    }
  }, [gameState, movePlayer]);

  useSwipeControls({
    onSwipe: handleSwipe,
    enabled: gameState === 'playing' && !isGameOver,
  });

  const handleSubmitScore = useCallback((initials: string) => {
    addHighScore(initials, player.score);
  }, [addHighScore, player.score]);

  const handlePlayAgain = useCallback(() => {
    handleStartGame();
  }, [handleStartGame]);

  const handleContinue = useCallback(() => {
    continueGame();
    startMusic();
  }, [continueGame, startMusic]);

  const handleMainMenu = useCallback(() => {
    setGameState('title');
  }, []);

  if (gameState === 'title') {
    return (
      <TitleScreen
        onStart={handleStartGame}
        highScores={highScores}
      />
    );
  }

  if (gameState === 'highscores') {
    return (
      <HighScoreTable
        scores={highScores}
        onBack={() => setGameState('title')}
      />
    );
  }

  // 8-bit pixel-snapped screen shake
  const shakePatterns = [[0, 0], [1, 0], [-1, 1], [0, -1], [1, 1], [-1, 0]];
  const shakePattern = shakePatterns[shakeFrame % shakePatterns.length];
  const shakeX = deathEffect ? shakePattern[0] : 0;
  const shakeY = deathEffect ? shakePattern[1] : 0;

  // Mobile aspect ratio: 9:16 (like iPhone)
  const ASPECT_RATIO = 9 / 16;

  return (
    <div className="flex items-start justify-center min-h-screen w-full bg-emerald-900">
      <div 
        className="relative flex flex-col items-center justify-start bg-gradient-to-b from-emerald-900 via-emerald-800 to-cyan-900 p-2 pt-2 overflow-hidden mx-auto"
        style={{
          width: 'min(100vw, 100vh * 9 / 16)',
          height: 'min(100vh, 100vw * 16 / 9)',
          maxWidth: '100vw',
          maxHeight: '100vh',
        }}
      >
        <div className="flex flex-col items-center w-full">
          <GameHUD lives={player.lives} score={player.score} level={level} />
          <div 
            className="relative transition-transform duration-75"
            style={{ 
              transform: `translate(${shakeX}px, ${shakeY}px)`,
            }}
          >
            <GameCanvas player={player} lanes={lanes} homeSpots={homeSpots} level={level} powerUp={powerUp} isInvincible={isInvincible} deathEffect={deathEffect} />
            <SwipeIndicator direction={lastSwipe} />
          </div>
        
          {/* Mobile swipe hint */}
          <p className="text-emerald-300/50 mt-4" style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '8px' }}>SWIPE TO MOVE</p>

          {isGameOver && (
            <GameOverScreen
              score={player.score}
              level={level}
              isHighScore={isHighScore(player.score)}
              continuesRemaining={continuesRemaining}
              onSubmitScore={handleSubmitScore}
              onContinue={handleContinue}
              onPlayAgain={handlePlayAgain}
              onMainMenu={handleMainMenu}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
