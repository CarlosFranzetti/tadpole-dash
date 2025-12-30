import { useCallback, useRef, useState, useEffect } from 'react';

type SoundType = 'hop' | 'splash' | 'crash' | 'victory' | 'gameover' | 'levelup' | 'dive' | 'surface';

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

// 8-bit style background music sequence
const MUSIC_NOTES = [
  { freq: 262, dur: 0.2 }, { freq: 294, dur: 0.2 }, { freq: 330, dur: 0.2 }, { freq: 349, dur: 0.2 },
  { freq: 392, dur: 0.4 }, { freq: 349, dur: 0.2 }, { freq: 330, dur: 0.2 },
  { freq: 294, dur: 0.2 }, { freq: 262, dur: 0.4 }, { freq: 0, dur: 0.2 },
  { freq: 330, dur: 0.2 }, { freq: 392, dur: 0.2 }, { freq: 440, dur: 0.2 }, { freq: 392, dur: 0.2 },
  { freq: 349, dur: 0.4 }, { freq: 330, dur: 0.2 }, { freq: 294, dur: 0.2 },
  { freq: 262, dur: 0.2 }, { freq: 294, dur: 0.2 }, { freq: 330, dur: 0.4 }, { freq: 0, dur: 0.2 },
];

export const useSoundEffects = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const musicIntervalRef = useRef<number | null>(null);
  const musicIndexRef = useRef(0);
  const isMusicPlayingRef = useRef(false);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playMusicNote = useCallback(() => {
    if (isMuted || !isMusicPlayingRef.current) return;
    
    try {
      const ctx = getAudioContext();
      const note = MUSIC_NOTES[musicIndexRef.current];
      
      if (note.freq > 0) {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(note.freq, ctx.currentTime);
        
        gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + note.dur * 0.9);
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + note.dur);
      }
      
      musicIndexRef.current = (musicIndexRef.current + 1) % MUSIC_NOTES.length;
    } catch (error) {
      console.log('Music playback failed:', error);
    }
  }, [getAudioContext, isMuted]);

  const startMusic = useCallback(() => {
    if (musicIntervalRef.current) return;
    
    isMusicPlayingRef.current = true;
    musicIndexRef.current = 0;
    
    // Play notes at intervals
    const playNextNote = () => {
      if (!isMusicPlayingRef.current) return;
      playMusicNote();
      const note = MUSIC_NOTES[musicIndexRef.current === 0 ? MUSIC_NOTES.length - 1 : musicIndexRef.current - 1];
      musicIntervalRef.current = window.setTimeout(playNextNote, note.dur * 1000);
    };
    
    playNextNote();
  }, [playMusicNote]);

  const stopMusic = useCallback(() => {
    isMusicPlayingRef.current = false;
    if (musicIntervalRef.current) {
      clearTimeout(musicIntervalRef.current);
      musicIntervalRef.current = null;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Cleanup on unmount and page close
  useEffect(() => {
    const handleBeforeUnload = () => {
      stopMusic();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      handleBeforeUnload();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [stopMusic]);

  const playSound = useCallback((type: SoundType) => {
    if (isMuted) return;
    
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
        case 'dive': {
          const { oscillator } = createOscillator(ctx, 120, 'sine', 0.25, 0.15);
          oscillator.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.25);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.25);
          break;
        }
        case 'surface': {
          const { oscillator } = createOscillator(ctx, 80, 'sine', 0.15, 0.12);
          oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.15);
          break;
        }
      }
    } catch (error) {
      console.log('Sound playback failed:', error);
    }
  }, [getAudioContext, isMuted]);

  return { playSound, isMuted, toggleMute, startMusic, stopMusic };
};
