/**
 * AudioPlayer — Queue-based auto-playing TTS audio with visual indicator.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { base64ToAudioUrl } from '../utils/audioUtils';

export default function AudioPlayer({ audioQueue, onAudioFinished }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);
  const queueRef = useRef([]);
  const isPlayingRef = useRef(false);

  // Process incoming audio chunks
  useEffect(() => {
    if (audioQueue && audioQueue.length > 0) {
      const latest = audioQueue[audioQueue.length - 1];
      if (latest) {
        queueRef.current.push(latest);
        processQueue();
      }
    }
  }, [audioQueue]);

  const processQueue = useCallback(async () => {
    if (isPlayingRef.current || queueRef.current.length === 0 || isMuted) return;

    isPlayingRef.current = true;
    setIsPlaying(true);

    while (queueRef.current.length > 0) {
      const base64Data = queueRef.current.shift();
      try {
        const url = base64ToAudioUrl(base64Data);
        await new Promise((resolve, reject) => {
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(); // Don't block queue on error
          };
          audio.play().catch(resolve);
        });
      } catch (e) {
        console.error('Audio playback error:', e);
      }
    }

    isPlayingRef.current = false;
    setIsPlaying(false);
    onAudioFinished?.();
  }, [isMuted, onAudioFinished]);

  const toggleMute = () => {
    setIsMuted(prev => {
      if (!prev && audioRef.current) {
        audioRef.current.pause();
        queueRef.current = [];
        isPlayingRef.current = false;
        setIsPlaying(false);
      }
      return !prev;
    });
  };

  return (
    <button
      onClick={toggleMute}
      className={`
        w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200
        ${isPlaying
          ? 'bg-accent/20 border border-accent/30 animate-pulse-glow'
          : 'bg-white/5 border border-white/10 hover:bg-white/10'
        }
      `}
      title={isMuted ? 'Unmute audio' : 'Mute audio'}
    >
      {isMuted ? (
        <VolumeX className="w-4 h-4 text-text-muted" />
      ) : (
        <Volume2 className={`w-4 h-4 ${isPlaying ? 'text-accent' : 'text-text-secondary'}`} />
      )}
    </button>
  );
}
