import { useState, useCallback } from 'react';
import { GameState } from '@/lib/gameTypes';
import { TitleScreen } from '@/components/game/TitleScreen';
import { GameCanvas } from '@/components/game/GameCanvas';
import { GameHUD } from '@/components/game/GameHUD';
import { GameOverScreen } from '@/components/game/GameOverScreen';
import { HighScoreTable } from '@/components/game/HighScoreTable';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useSwipeControls } from '@/hooks/useSwipeControls';
import { useHighScores } from '@/hooks/useHighScores';

const Index = () => {
  const [gameState, setGameState] = useState<GameState>('title');
  const { highScores, addHighScore, isHighScore } = useHighScores();
  const { player, lanes, homeSpots, level, isGameOver, startGame, movePlayer } = useGameLogic();

  const handleStartGame = useCallback(() => {
    setGameState('playing');
    startGame();
  }, [startGame]);

  const handleSwipe = useCallback((direction: 'up' | 'down' | 'left' | 'right' | null) => {
    if (gameState === 'playing' && direction) {
      movePlayer(direction);
    }
  }, [gameState, movePlayer]);

  useSwipeControls({
    onSwipe: handleSwipe,
    enabled: gameState === 'playing',
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-emerald-900 via-emerald-800 to-cyan-900 p-2">
      <GameHUD lives={player.lives} score={player.score} level={level} />
      <GameCanvas player={player} lanes={lanes} homeSpots={homeSpots} level={level} />
      
      {/* Mobile swipe hint */}
      <p className="text-emerald-300/50 text-sm mt-4">Swipe to move your frog!</p>

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
  );
};

export default Index;
