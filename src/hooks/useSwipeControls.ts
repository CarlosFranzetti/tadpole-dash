import { useEffect, useRef, useCallback } from 'react';
import { SwipeDirection } from '@/lib/gameTypes';

interface SwipeConfig {
  onSwipe: (direction: SwipeDirection) => void;
  minSwipeDistance?: number;
  enabled?: boolean;
}

export const useSwipeControls = ({ onSwipe, minSwipeDistance = 30, enabled = true }: SwipeConfig) => {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }, [enabled]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || !touchStart.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    if (Math.max(absX, absY) < minSwipeDistance) {
      touchStart.current = null;
      return;
    }
    
    let direction: SwipeDirection = null;
    
    if (absX > absY) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }
    
    onSwipe(direction);
    touchStart.current = null;
  }, [enabled, minSwipeDistance, onSwipe]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        e.preventDefault();
        onSwipe('up');
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        e.preventDefault();
        onSwipe('down');
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault();
        onSwipe('left');
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        e.preventDefault();
        onSwipe('right');
        break;
    }
  }, [enabled, onSwipe]);

  useEffect(() => {
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleTouchStart, handleTouchEnd, handleKeyDown]);
};
