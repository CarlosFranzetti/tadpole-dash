import { useState, useCallback, useEffect } from 'react';
import { z } from 'zod';
import { HighScore } from '@/lib/gameTypes';

const STORAGE_KEY = 'tadpole-high-scores';
const MAX_SCORES = 5;

// Zod schema for validating high score data from localStorage
const HighScoreSchema = z.object({
  initials: z.string().min(1).max(3).regex(/^[A-Z ]{1,3}$/),
  score: z.number().int().min(0).max(999999999),
  date: z.string().min(1).max(20),
});

const HighScoresArraySchema = z.array(HighScoreSchema);

const DEFAULT_SCORES: HighScore[] = [
  { initials: 'AAA', score: 500, date: '1/1/26' },
  { initials: 'BBB', score: 400, date: '1/1/26' },
  { initials: 'CCC', score: 300, date: '1/1/26' },
  { initials: 'DDD', score: 200, date: '1/1/26' },
  { initials: 'EEE', score: 100, date: '1/1/26' },
];

export const useHighScores = () => {
  const [highScores, setHighScores] = useState<HighScore[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Validate parsed data against schema to prevent XSS/injection
        const validated = HighScoresArraySchema.safeParse(parsed);
        if (validated.success && validated.data.length > 0) {
          setHighScores(validated.data as HighScore[]);
        } else {
          // Invalid data structure, reset to defaults
          setHighScores(DEFAULT_SCORES);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SCORES));
        }
      } catch {
        setHighScores(DEFAULT_SCORES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SCORES));
      }
    } else {
      setHighScores(DEFAULT_SCORES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SCORES));
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
