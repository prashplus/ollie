/**
 * VoiceButton — Robust Click-to-Talk and Push-to-Talk audio recording button.
 * Supports tap-to-toggle, hold-to-speak, live timer, and instant click-to-cancel when processing.
 */

import { useState, useRef } from 'react';
import { Mic, Square, Loader2, X, StopCircle } from 'lucide-react';

export default function VoiceButton({
  isRecording,
  isProcessing,
  waveformData = [],
  recordingDuration = 0,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  onCancelProcessing,
  permissionError,
  compact = false,
}) {
  const [pressStartTime, setPressStartTime] = useState(null);
  const isHoldingRef = useRef(false);

  // Handle pointer down (tap or hold)
  const handlePointerDown = (e) => {
    if (isProcessing) {
      // Tap to cancel processing
      onCancelProcessing?.();
      return;
    }

    setPressStartTime(Date.now());
    isHoldingRef.current = true;

    if (!isRecording) {
      onStartRecording();
    }
  };

  // Handle pointer up
  const handlePointerUp = (e) => {
    if (isProcessing) return;
    if (!isHoldingRef.current) return;
    isHoldingRef.current = false;

    const holdDuration = pressStartTime ? Date.now() - pressStartTime : 0;
    setPressStartTime(null);

    // If held down for > 400ms (push-to-talk hold), stop on release
    if (isRecording && holdDuration > 400) {
      onStopRecording();
    }
  };

  // Handle explicit click
  const handleClick = (e) => {
    e.stopPropagation();

    if (isProcessing) {
      onCancelProcessing?.();
      return;
    }

    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  // Format seconds into 0:00
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Floating active recording banner */}
      {isRecording && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-3.5 py-2 bg-slate-900/95 backdrop-blur-2xl border border-red-500/40 rounded-2xl shadow-2xl animate-fade-in z-30 whitespace-nowrap">
          {/* Pulsing red dot + timer */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-bold text-red-400 font-mono">
              {formatTime(recordingDuration)}
            </span>
          </div>

          {/* Mini waveform bars */}
          <div className="flex items-center gap-1 h-5 px-1">
            {waveformData.slice(0, 16).map((val, i) => (
              <div
                key={i}
                className="w-1 bg-gradient-to-t from-red-500 to-rose-400 rounded-full transition-all duration-75"
                style={{ height: `${Math.max(4, val * 20)}px` }}
              />
            ))}
          </div>

          {/* Cancel button */}
          {onCancelRecording && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancelRecording();
              }}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all active:scale-95 ml-1"
              title="Cancel recording"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Main Action Button */}
      <button
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className={`
          flex items-center justify-center transition-all duration-200 select-none touch-none
          ${compact ? 'w-10 h-10 rounded-2xl' : 'w-11 h-11 rounded-2xl'}
          ${isRecording
            ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/40 scale-105 animate-pulse'
            : isProcessing
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-red-500/25 hover:border-red-500/50 hover:text-red-300 shadow-md active:scale-95'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 active:scale-95'
          }
        `}
        title={
          isRecording
            ? 'Tap to finish & send voice'
            : isProcessing
              ? 'Processing... Tap to Cancel/Unlock'
              : 'Tap or hold to speak'
        }
      >
        {isProcessing ? (
          <div className="relative flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
            <span className="sr-only">Cancel</span>
          </div>
        ) : isRecording ? (
          <Square className="w-4 h-4 text-white fill-white" />
        ) : (
          <Mic className="w-5 h-5 text-white" />
        )}
      </button>
    </div>
  );
}
