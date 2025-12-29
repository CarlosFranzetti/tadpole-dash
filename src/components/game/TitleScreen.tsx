import { motion } from 'framer-motion';

interface TitleScreenProps {
  onStart: () => void;
  onHighScores: () => void;
}

export const TitleScreen = ({ onStart, onHighScores }: TitleScreenProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-emerald-900 via-emerald-800 to-cyan-900 p-4">
      {/* Pixel Art Frog */}
      <motion.div 
        className="mb-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.8 }}
      >
        <svg viewBox="0 0 64 64" className="w-32 h-32" style={{ imageRendering: 'pixelated' }}>
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

      {/* Title */}
      <motion.h1 
        className="text-6xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-lime-300 via-green-400 to-emerald-500 mb-2"
        style={{ 
          fontFamily: '"Press Start 2P", monospace',
          textShadow: '4px 4px 0 #166534, 8px 8px 0 #14532d',
          letterSpacing: '0.1em'
        }}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        TADPOLE
      </motion.h1>

      <motion.p
        className="text-lime-200 text-sm mb-8 opacity-75"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.75 }}
        transition={{ delay: 0.6 }}
      >
        A Frogger Adventure
      </motion.p>

      {/* Buttons */}
      <motion.div 
        className="flex flex-col gap-4 w-full max-w-xs"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <button
          onClick={onStart}
          className="px-8 py-4 bg-gradient-to-r from-lime-500 to-green-600 hover:from-lime-400 hover:to-green-500 text-white font-bold text-xl rounded-lg shadow-lg transform hover:scale-105 transition-all border-b-4 border-green-700 active:border-b-0 active:translate-y-1"
          style={{ fontFamily: 'inherit' }}
        >
          TAP TO START
        </button>

        <button
          onClick={onHighScores}
          className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-lg rounded-lg shadow-lg transform hover:scale-105 transition-all border-b-4 border-orange-700 active:border-b-0 active:translate-y-1"
          style={{ fontFamily: 'inherit' }}
        >
          HIGH SCORES
        </button>
      </motion.div>

      {/* Controls hint */}
      <motion.div 
        className="mt-12 text-lime-200/60 text-center text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <p>Swipe to move</p>
        <p className="text-xs mt-1">or use arrow keys</p>
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
    </div>
  );
};
