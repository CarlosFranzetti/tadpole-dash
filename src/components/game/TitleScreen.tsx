import { motion } from 'framer-motion';
import { HighScore } from '@/lib/gameTypes';

interface TitleScreenProps {
  onStart: () => void;
  highScores: HighScore[];
}

export const TitleScreen = ({ onStart, highScores }: TitleScreenProps) => {
  const displayScores = highScores.slice(0, 5);

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <motion.div 
        className="relative flex flex-col items-center justify-start bg-gradient-to-b from-emerald-900 via-emerald-800 to-cyan-900 p-4 pt-[6vh] overflow-hidden"
        style={{
          width: 'min(100vw, 100vh * 9 / 16)',
          height: 'min(100vh, 100vw * 16 / 9)',
          maxWidth: '100vw',
          maxHeight: '100vh',
        }}
        initial={{ opacity: 0, backgroundColor: '#000' }}
        animate={{ opacity: 1, backgroundColor: 'transparent' }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      >
      {/* Pixel Art Frog */}
      <motion.div 
        className="mb-4"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.8 }}
      >
        <svg viewBox="0 0 64 64" className="w-24 h-24" style={{ imageRendering: 'pixelated' }}>
          {/* Body */}
          <rect x="20" y="28" width="24" height="20" fill="#4ade80" />
          <rect x="16" y="32" width="4" height="12" fill="#4ade80" />
          <rect x="44" y="32" width="4" height="12" fill="#4ade80" />
          {/* Eyes */}
          <rect x="22" y="20" width="8" height="8" fill="#4ade80" />
          <rect x="34" y="20" width="8" height="8" fill="#4ade80" />
          <rect x="24" y="22" width="4" height="4" fill="#ffffff" />
          <rect x="36" y="22" width="4" height="4" fill="#ffffff" />
          <rect x="25" y="23" width="2" height="2" fill="#000000" />
          <rect x="37" y="23" width="2" height="2" fill="#000000" />
          {/* Legs */}
          <rect x="12" y="44" width="8" height="4" fill="#22c55e" />
          <rect x="44" y="44" width="8" height="4" fill="#22c55e" />
          <rect x="8" y="48" width="8" height="8" fill="#22c55e" />
          <rect x="48" y="48" width="8" height="8" fill="#22c55e" />
          {/* Spots */}
          <rect x="24" y="32" width="4" height="4" fill="#22c55e" />
          <rect x="36" y="36" width="4" height="4" fill="#22c55e" />
          <rect x="28" y="40" width="4" height="4" fill="#22c55e" />
        </svg>
      </motion.div>

      {/* Title - Pixel Font */}
      <motion.h1 
        className="text-3xl md:text-4xl text-lime-300 mb-1"
        style={{ 
          fontFamily: '"Press Start 2P", monospace',
          textShadow: '3px 3px 0 #166534, 6px 6px 0 #14532d',
          letterSpacing: '0.05em'
        }}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        TADPOLE
      </motion.h1>

      <motion.p
        className="text-lime-200 text-xs mb-6 opacity-75"
        style={{ fontFamily: '"Press Start 2P", monospace' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.75 }}
        transition={{ delay: 0.6 }}
      >
        A FROGGER ADVENTURE
      </motion.p>

      {/* Start Button - Pixel Style */}
      <motion.div 
        className="w-full max-w-xs mb-4"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <button
          onClick={onStart}
          className="w-full px-6 py-4 bg-lime-500 hover:bg-lime-400 text-emerald-900 text-sm rounded-none shadow-lg transform hover:scale-105 transition-all border-4 border-lime-700 active:translate-y-1"
          style={{ 
            fontFamily: '"Press Start 2P", monospace',
            boxShadow: '4px 4px 0 #166534'
          }}
        >
          START GAME
        </button>
      </motion.div>

      {/* High Scores Pixel Frame */}
      <motion.div
        className="w-full max-w-xs mb-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7, duration: 0.4 }}
      >
        <div 
          className="bg-emerald-950/80 border-4 border-lime-600 p-3"
          style={{ 
            boxShadow: '4px 4px 0 #14532d, inset 2px 2px 0 #4ade80',
            imageRendering: 'pixelated'
          }}
        >
          {/* Frame Header */}
          <div 
            className="text-center text-amber-400 text-xs mb-2 pb-2 border-b-2 border-lime-700"
            style={{ fontFamily: '"Press Start 2P", monospace' }}
          >
            HIGH SCORES
          </div>

          {/* Scores List */}
          <div className="space-y-1">
            {displayScores.length === 0 ? (
              <div 
                className="text-center text-lime-400/50 text-[8px] py-2"
                style={{ fontFamily: '"Press Start 2P", monospace' }}
              >
                NO SCORES YET!
              </div>
            ) : (
              displayScores.map((score, index) => (
                <div 
                  key={index}
                  className="flex justify-between items-center text-[10px]"
                  style={{ fontFamily: '"Press Start 2P", monospace' }}
                >
                  <span className={`${
                    index === 0 ? 'text-amber-400' : 
                    index === 1 ? 'text-gray-300' : 
                    index === 2 ? 'text-orange-400' : 
                    'text-lime-400'
                  }`}>
                    {index === 0 ? '1.' : index === 1 ? '2.' : index === 2 ? '3.' : `${index + 1}.`}
                  </span>
                  <span className="text-white flex-1 ml-2">{score.initials}</span>
                  <span className="text-amber-300">{score.score.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>

      {/* Controls hint - Pixel Font */}
      <motion.div 
        className="text-lime-200/60 text-center"
        style={{ fontFamily: '"Press Start 2P", monospace' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <p className="text-xs">SWIPE TO MOVE</p>
        <p className="text-[8px] mt-2 opacity-60">OR USE ARROW KEYS</p>
      </motion.div>

      {/* Decorative lily pads */}
      <div className="absolute bottom-0 left-0 right-0 h-24 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-12 h-8 rounded-full bg-green-600/30"
            style={{ left: `${10 + i * 18}%`, bottom: `${5 + (i % 3) * 15}px` }}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
          />
        ))}
      </div>
    </motion.div>
    </div>
  );
};
