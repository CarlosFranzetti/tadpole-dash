import { motion } from 'framer-motion';
import { Trophy, ArrowLeft } from 'lucide-react';
import { HighScore } from '@/lib/gameTypes';

interface HighScoreTableProps {
  scores: HighScore[];
  onBack: () => void;
}

export const HighScoreTable = ({ scores, onBack }: HighScoreTableProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-emerald-900 via-emerald-800 to-cyan-900 p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Trophy className="w-10 h-10 text-amber-400" />
          <h1 className="text-3xl font-bold text-amber-300"
            style={{ textShadow: '2px 2px 0 #92400e' }}
          >
            HIGH SCORES
          </h1>
          <Trophy className="w-10 h-10 text-amber-400" />
        </div>

        {/* Score Table */}
        <div className="bg-emerald-950/50 rounded-xl border-2 border-emerald-600 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[40px_1fr_1fr_80px] gap-2 px-4 py-3 bg-emerald-800/50 text-emerald-300 font-bold text-sm">
            <span>#</span>
            <span>NAME</span>
            <span className="text-right">SCORE</span>
            <span className="text-right">DATE</span>
          </div>

          {/* Score Rows */}
          <div className="divide-y divide-emerald-800/50">
            {scores.length === 0 ? (
              <div className="px-4 py-8 text-center text-emerald-400/60">
                No high scores yet!<br />Be the first to play!
              </div>
            ) : (
              scores.map((score, index) => (
                <motion.div
                  key={index}
                  className={`grid grid-cols-[40px_1fr_1fr_80px] gap-2 px-4 py-3 ${
                    index === 0 ? 'bg-amber-900/30' : ''
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <span className={`font-bold ${
                    index === 0 ? 'text-amber-400' : 
                    index === 1 ? 'text-gray-300' : 
                    index === 2 ? 'text-orange-400' : 
                    'text-emerald-400'
                  }`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                  </span>
                  <span className="text-white font-bold tracking-wider">
                    {score.initials}
                  </span>
                  <span className="text-amber-300 font-bold text-right">
                    {score.score.toLocaleString()}
                  </span>
                  <span className="text-emerald-400/60 text-sm text-right">
                    {score.date}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Back Button */}
        <motion.button
          onClick={onBack}
          className="mt-8 w-full py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-bold rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 border-b-4 border-gray-800 active:border-b-0 active:translate-y-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <ArrowLeft className="w-5 h-5" />
          BACK TO MENU
        </motion.button>
      </motion.div>
    </div>
  );
};
