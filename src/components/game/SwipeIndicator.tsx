import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SwipeDirection } from '@/lib/gameTypes';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface SwipeIndicatorProps {
  direction: SwipeDirection;
}

const arrowConfig = {
  up: { Icon: ArrowUp, x: 0, y: -20 },
  down: { Icon: ArrowDown, x: 0, y: 20 },
  left: { Icon: ArrowLeft, x: -20, y: 0 },
  right: { Icon: ArrowRight, x: 20, y: 0 },
};

export const SwipeIndicator = ({ direction }: SwipeIndicatorProps) => {
  const [visible, setVisible] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (direction) {
      setVisible(true);
      setKey(prev => prev + 1);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [direction]);

  if (!direction) return null;

  const config = arrowConfig[direction];
  const { Icon } = config;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={key}
          initial={{ opacity: 0.9, scale: 1, x: 0, y: 0 }}
          animate={{ 
            opacity: 0, 
            scale: 1.5, 
            x: config.x, 
            y: config.y 
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
        >
          <div className="bg-emerald-400/40 rounded-full p-4">
            <Icon className="w-12 h-12 text-emerald-200" strokeWidth={3} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
