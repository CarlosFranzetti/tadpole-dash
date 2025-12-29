import { useState } from 'react';
import { motion } from 'framer-motion';

interface GameOverScreenProps {
  score: number;
  level: number;
  isHighScore: boolean;
  onSubmitScore: (initials: string) => void;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export const GameOverScreen = ({
  score,
  level,
  isHighScore,
  onSubmitScore,
  onPlayAgain,
  onMainMenu,
}: GameOverScreenProps) => {
  const [initials, setInitials] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (initials.length >= 1) {
      onSubmitScore(initials.toUpperCase().padEnd(3, ' '));
      setSubmitted(true);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center bg-black/80 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-gradient-to-b from-emerald-900 to-cyan-900 p-8 rounded-2xl shadow-2xl border-4 border-emerald-500 max-w-sm w-full mx-4"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.5 }}
      >
        <h2 className="text-4xl font-bold text-red-400 text-center mb-6"
          style={{ textShadow: '2px 2px 0 #7f1d1d' }}
        >
          GAME OVER
        </h2>

        <div className="text-center mb-6">
          <p className="text-lime-200 text-lg">Level Reached</p>
          <p className="text-3xl font-bold text-lime-400">{level}</p>
        </div>

        <div className="text-center mb-6">
          <p className="text-amber-200 text-lg">Final Score</p>
          <p className="text-4xl font-bold text-amber-400">{score.toLocaleString()}</p>
        </div>

        {isHighScore && !submitted && (
          <motion.div
            className="mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-yellow-300 text-center font-bold mb-3 text-lg animate-pulse">
              🏆 NEW HIGH SCORE! 🏆
            </p>
            <div className="flex gap-2 justify-center">
              <input
                type="text"
                maxLength={3}
                value={initials}
                onChange={(e) => setInitials(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                placeholder="AAA"
                className="w-24 text-center text-2xl font-bold bg-emerald-800 border-2 border-emerald-500 rounded-lg py-2 text-white uppercase tracking-widest focus:outline-none focus:border-lime-400"
                autoFocus
              />
              <button
                onClick={handleSubmit}
                disabled={initials.length < 1}
                className="px-4 py-2 bg-lime-500 hover:bg-lime-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
              >
                SAVE
              </button>
            </div>
          </motion.div>
        )}

        {submitted && (
          <p className="text-lime-300 text-center mb-6 font-bold">
            ✓ Score saved!
          </p>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={onPlayAgain}
            className="w-full py-3 bg-gradient-to-r from-lime-500 to-green-600 hover:from-lime-400 hover:to-green-500 text-white font-bold text-lg rounded-lg shadow-lg transition-all border-b-4 border-green-700 active:border-b-0 active:translate-y-1"
          >
            PLAY AGAIN
          </button>
          <button
            onClick={onMainMenu}
            className="w-full py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-bold rounded-lg shadow-lg transition-all border-b-4 border-gray-800 active:border-b-0 active:translate-y-1"
          >
            MAIN MENU
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
