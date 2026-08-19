/**
 * VoiceHome — Immersive, clean voice-first kiosk home screen.
 * Centered layout with generous margins away from phone curved corners,
 * large glowing Voice Orb, clear word-wrapped captions, and prominent touch action cards.
 */

import { Mic, Square, Loader2, Newspaper, CloudSun, StickyNote, Activity, Sparkles } from 'lucide-react';

export default function VoiceHome({
  isRecording,
  isProcessing,
  isPlayingAudio,
  processingStatus,
  waveformData = [],
  recordingDuration = 0,
  latestResponse,
  latestUserPrompt,
  onStartRecording,
  onStopRecording,
  onCancelProcessing,
  onQuickPrompt,
  onSwitchToChat,
}) {
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleOrbClick = () => {
    if (isProcessing) {
      onCancelProcessing?.();
      return;
    }
    if (isRecording) {
      onStopRecording?.();
    } else {
      onStartRecording?.();
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between items-center px-4 sm:px-8 py-3 sm:py-5 text-center select-none overflow-hidden max-w-md mx-auto w-full">
      {/* Upper Area: Glowing Voice Orb */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto w-full">
        {/* Voice Orb Button Container */}
        <div className="relative mb-6">
          {/* Ambient Glow Aura */}
          <div
            className={`absolute inset-0 rounded-full blur-2xl transition-all duration-500 ${
              isRecording
                ? 'bg-red-500/50 scale-135 animate-pulse'
                : isProcessing
                  ? 'bg-amber-500/40 scale-120 animate-spin'
                  : isPlayingAudio
                    ? 'bg-emerald-500/50 scale-135 animate-pulse'
                    : 'bg-blue-500/30 scale-110'
            }`}
          />

          {/* Central Interactive Voice Orb Button */}
          <button
            onClick={handleOrbClick}
            className={`relative w-40 h-40 sm:w-48 sm:h-48 rounded-full flex flex-col items-center justify-center border-4 transition-all duration-300 shadow-2xl active:scale-95 ${
              isRecording
                ? 'bg-gradient-to-br from-red-600 via-rose-600 to-red-800 border-red-300 shadow-red-600/60 scale-105'
                : isProcessing
                  ? 'bg-gradient-to-br from-slate-900 via-amber-950/40 to-slate-900 border-amber-400 shadow-amber-500/30'
                  : isPlayingAudio
                    ? 'bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 border-emerald-300 shadow-emerald-600/50'
                    : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 border-blue-300/60 shadow-blue-600/50 hover:scale-105'
            }`}
            title={
              isRecording
                ? 'Tap to Stop & Send'
                : isProcessing
                  ? 'Processing... Tap to Cancel'
                  : 'Tap to Speak'
            }
          >
            {isProcessing ? (
              <div className="flex flex-col items-center gap-2 px-2">
                <Loader2 className="w-12 h-12 text-amber-300 animate-spin" />
                <span className="text-xs font-black text-amber-200 uppercase tracking-wider">
                  Thinking...
                </span>
                <span className="text-[10px] text-slate-400">
                  Tap to cancel
                </span>
              </div>
            ) : isRecording ? (
              <div className="flex flex-col items-center gap-1.5 px-2">
                <Square className="w-8 h-8 text-white fill-white animate-pulse" />
                <span className="text-base font-black text-white font-mono">
                  {formatTime(recordingDuration)}
                </span>
                <span className="text-[10px] font-bold text-red-100 uppercase tracking-wider">
                  Tap to Send
                </span>
              </div>
            ) : isPlayingAudio ? (
              <div className="flex flex-col items-center gap-2 px-2">
                <Activity className="w-12 h-12 text-white animate-pulse" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Speaking...
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 px-2">
                <Mic className="w-14 h-14 text-white" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Tap to Talk
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Real-time waveform bar when recording */}
        {isRecording && (
          <div className="flex items-center gap-1 h-6 px-4 py-1 bg-slate-900/90 rounded-full border border-red-500/40 mb-4 animate-fade-in shadow-lg">
            {waveformData.slice(0, 24).map((val, i) => (
              <div
                key={i}
                className="w-1 bg-gradient-to-t from-red-500 to-rose-400 rounded-full transition-all duration-75"
                style={{ height: `${Math.max(4, val * 22)}px` }}
              />
            ))}
          </div>
        )}

        {/* Spoken Response & Captions Box (Safe word-wrap, zero overflow) */}
        <div className="w-full bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-4 sm:p-5 shadow-2xl text-left overflow-hidden">
          {latestUserPrompt && (
            <p className="text-xs font-bold text-blue-400 mb-1.5 truncate">
              You: <span className="text-slate-200 font-medium">{latestUserPrompt}</span>
            </p>
          )}

          <div className="text-sm sm:text-base text-slate-100 leading-relaxed font-medium max-h-32 overflow-y-auto pr-1 break-words">
            {processingStatus ? (
              <div className="flex items-center gap-2 text-blue-300 font-bold animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                <span>{processingStatus}</span>
              </div>
            ) : latestResponse ? (
              <p className="whitespace-pre-wrap">{latestResponse}</p>
            ) : (
              <p className="text-slate-400 italic">
                "Hello! Tap the orb above to talk, or select a quick topic below."
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Area: Big Touch Action Buttons with safe-area bottom margin */}
      <div className="w-full pt-3 pb-5 sm:pb-3">
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={() => onQuickPrompt?.('Tell me the top breaking news headlines right now.')}
            disabled={isProcessing}
            className="flex flex-col items-center justify-center min-h-[68px] p-3 rounded-2xl bg-slate-800/95 border border-white/20 hover:bg-blue-600/30 hover:border-blue-400 text-white font-bold text-xs shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            <Newspaper className="w-5 h-5 text-blue-400 mb-1" />
            <span className="leading-tight">Top News</span>
          </button>

          <button
            onClick={() => onQuickPrompt?.('What is the weather today in Bengaluru?')}
            disabled={isProcessing}
            className="flex flex-col items-center justify-center min-h-[68px] p-3 rounded-2xl bg-slate-800/95 border border-white/20 hover:bg-amber-600/30 hover:border-amber-400 text-white font-bold text-xs shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            <CloudSun className="w-5 h-5 text-amber-400 mb-1" />
            <span className="leading-tight">Weather</span>
          </button>

          <button
            onClick={() => onQuickPrompt?.('What are my current family notes?')}
            disabled={isProcessing}
            className="flex flex-col items-center justify-center min-h-[68px] p-3 rounded-2xl bg-slate-800/95 border border-white/20 hover:bg-emerald-600/30 hover:border-emerald-400 text-white font-bold text-xs shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            <StickyNote className="w-5 h-5 text-emerald-400 mb-1" />
            <span className="leading-tight">Notes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
