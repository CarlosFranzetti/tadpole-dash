import { useState, useCallback } from 'react';
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

const Index = () => {
  const [gameState, setGameState] = useState<GameState>('title');
  const [lastSwipe, setLastSwipe] = useState<SwipeDirection>(null);
  const { highScores, addHighScore, isHighScore } = useHighScores();
  const { player, lanes, homeSpots, level, isGameOver, powerUp, isInvincible, deathEffect, startGame, movePlayer } = useGameLogic();

  const handleStartGame = useCallback(() => {
    setGameState('playing');
    startGame();
  }, [startGame]);

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

  const handleMainMenu = useCallback(() => {
    setGameState('title');
  }, []);

  if (gameState === 'title') {
    return (
      <TitleScreen
        onStart={handleStartGame}
        onHighScores={() => setGameState('highscores')}
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

  // Screen shake when death effect is active (half intensity)
  const shakeIntensity = deathEffect ? 2 : 0;
  const shakeX = deathEffect ? Math.sin(Date.now() * 0.05) * shakeIntensity : 0;
  const shakeY = deathEffect ? Math.cos(Date.now() * 0.07) * shakeIntensity : 0;

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gradient-to-b from-emerald-900 via-emerald-800 to-cyan-900 p-2 pt-8">
      <div className="flex flex-col items-center">
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
        <p className="text-emerald-300/50 text-sm mt-4" style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '8px' }}>SWIPE TO MOVE</p>

        {isGameOver && (
          <GameOverScreen
            score={player.score}
            level={level}
            isHighScore={isHighScore(player.score)}
            onSubmitScore={handleSubmitScore}
            onPlayAgain={handlePlayAgain}
            onMainMenu={handleMainMenu}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
