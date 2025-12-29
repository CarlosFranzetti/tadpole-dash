import { useState, useCallback, useEffect } from 'react';
import { HighScore } from '@/lib/gameTypes';

const STORAGE_KEY = 'tadpole-high-scores';
const MAX_SCORES = 10;

export const useHighScores = () => {
  const [highScores, setHighScores] = useState<HighScore[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setHighScores(JSON.parse(stored));
      } catch {
        setHighScores([]);
      }
    }
  }, []);

  const addHighScore = useCallback((initials: string, score: number) => {
    const newScore: HighScore = {
      initials: initials.toUpperCase().slice(0, 3),
      score,
      date: new Date().toLocaleDateString(),
    };

    setHighScores(prev => {
      const updated = [...prev, newScore]
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_SCORES);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isHighScore = useCallback((score: number) => {
    if (highScores.length < MAX_SCORES) return true;
    return score > (highScores[highScores.length - 1]?.score || 0);
  }, [highScores]);

  return { highScores, addHighScore, isHighScore };
};
