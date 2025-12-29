import { useCallback, useRef } from 'react';

type SoundType = 'hop' | 'splash' | 'crash' | 'victory' | 'gameover' | 'levelup';

const createOscillator = (
  audioContext: AudioContext,
  frequency: number,
  type: OscillatorType,
  duration: number,
  gainValue: number = 0.3
) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  
  gainNode.gain.setValueAtTime(gainValue, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  return { oscillator, gainNode };
};

export const useSoundEffects = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback((type: SoundType) => {
    try {
      const ctx = getAudioContext();
      
      switch (type) {
        case 'hop': {
          const { oscillator } = createOscillator(ctx, 400, 'square', 0.1, 0.2);
          oscillator.frequency.setValueAtTime(400, ctx.currentTime);
          oscillator.frequency.setValueAtTime(600, ctx.currentTime + 0.05);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.1);
          break;
        }
        case 'splash': {
          const { oscillator } = createOscillator(ctx, 200, 'sawtooth', 0.3, 0.3);
          oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        }
        case 'crash': {
          const { oscillator } = createOscillator(ctx, 150, 'sawtooth', 0.4, 0.4);
          oscillator.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.4);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.4);
          break;
        }
        case 'victory': {
          const notes = [523, 659, 784, 1047];
          notes.forEach((freq, i) => {
            const { oscillator } = createOscillator(ctx, freq, 'square', 0.15, 0.2);
            oscillator.start(ctx.currentTime + i * 0.1);
            oscillator.stop(ctx.currentTime + i * 0.1 + 0.15);
          });
          break;
        }
        case 'gameover': {
          const notes = [392, 349, 330, 262];
          notes.forEach((freq, i) => {
            const { oscillator } = createOscillator(ctx, freq, 'square', 0.3, 0.25);
            oscillator.start(ctx.currentTime + i * 0.25);
            oscillator.stop(ctx.currentTime + i * 0.25 + 0.3);
          });
          break;
        }
        case 'levelup': {
          const notes = [262, 330, 392, 523, 659, 784];
          notes.forEach((freq, i) => {
            const { oscillator } = createOscillator(ctx, freq, 'triangle', 0.12, 0.2);
            oscillator.start(ctx.currentTime + i * 0.08);
            oscillator.stop(ctx.currentTime + i * 0.08 + 0.12);
          });
          break;
        }
      }
    } catch (error) {
      console.log('Sound playback failed:', error);
    }
  }, [getAudioContext]);

  return { playSound };
};
