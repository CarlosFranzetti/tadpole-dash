import { Heart } from 'lucide-react';

interface GameHUDProps {
  lives: number;
  score: number;
  level: number;
}

export const GameHUD = ({ lives, score, level }: GameHUDProps) => {
  return (
    <div className="w-full max-w-[360px] flex justify-between items-center px-2 py-3 bg-gradient-to-r from-emerald-900 to-cyan-900 rounded-t-lg border-b-2 border-emerald-600">
      {/* Lives */}
      <div className="flex items-center gap-1">
        {[...Array(3)].map((_, i) => (
          <Heart
            key={i}
            className={`w-6 h-6 transition-all ${
              i < lives 
                ? 'text-red-500 fill-red-500' 
                : 'text-gray-600 fill-gray-600 opacity-40'
            }`}
          />
        ))}
      </div>

      {/* Level */}
      <div className="text-lime-300 font-bold text-sm px-3 py-1 bg-emerald-800/50 rounded">
        LVL {level}
      </div>

      {/* Score */}
      <div className="text-amber-300 font-bold text-lg min-w-[80px] text-right">
        {score.toLocaleString()}
      </div>
    </div>
  );
};
