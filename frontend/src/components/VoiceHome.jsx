/**
 * VoiceHome — Universal Voice Kiosk for all screens & orientations.
 *
 * Scales fluidly from small phones (360px) to iPads, desktop monitors,
 * and horizontal/landscape viewports.
 */

import { Mic, Square, Loader2, Newspaper, CloudSun, StickyNote, Clock, Activity, Sparkles } from 'lucide-react';

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
    <div className="responsive-shell kiosk-width-constraint px-4 sm:px-6 py-2 sm:py-4 select-none min-h-0">
      {/* ── Central Stage: Orb + Response Card ── */}
      <div className="kiosk-stage-area flex-1 flex flex-col items-center justify-center w-full min-h-0 gap-4 sm:gap-6 my-auto py-1">
        {/* Living AI Voice Orb */}
        <div className="relative flex items-center justify-center flex-shrink-0">
          {/* Ambient Glow Aura */}
          <div
            className={`absolute -inset-6 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
              isRecording
                ? 'bg-rose-500/45 scale-125 animate-pulse'
                : isProcessing
                  ? 'bg-amber-500/35 scale-115 animate-celestial'
                  : isPlayingAudio
                    ? 'bg-emerald-500/40 scale-125 animate-pulse'
                    : 'bg-blue-600/30 scale-105 animate-organic-pulse'
            }`}
          />

          {/* Rotating Ring when Thinking or Recording */}
          {(isProcessing || isRecording) && (
            <div
              className={`absolute -inset-3 rounded-full border-2 border-dashed pointer-events-none ${
                isRecording
                  ? 'border-rose-400/60 animate-spin'
                  : 'border-amber-400/50 animate-celestial'
              }`}
              style={{ animationDuration: isRecording ? '4s' : '8s' }}
            />
          )}

          {/* Fluid Responsive Core Button */}
          <button
            onClick={handleOrbClick}
            className={`responsive-voice-orb z-10 ${
              isRecording
                ? 'bg-gradient-to-br from-rose-600 via-red-600 to-rose-900 border-rose-300 shadow-rose-600/50 scale-105'
                : isProcessing
                  ? 'bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-900 border-amber-400/70 shadow-amber-500/30'
                  : isPlayingAudio
                    ? 'bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 border-emerald-300 shadow-emerald-600/50'
                    : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-800 border-white/25 shadow-blue-600/40 hover:scale-105 hover:border-white/40'
            }`}
            title={
              isRecording
                ? 'Tap to send voice'
                : isProcessing
                  ? 'Thinking... Tap to cancel'
                  : 'Tap to speak'
            }
          >
            {isProcessing ? (
              <div className="flex flex-col items-center gap-1.5 px-3">
                <div className="relative flex items-center justify-center">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-amber-400/30 border-t-amber-300 animate-spin" />
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 absolute" />
                </div>
                <span className="text-xs sm:text-sm font-black text-amber-200 tracking-wider uppercase">
                  Thinking
                </span>
                <span className="text-[10px] text-slate-300 font-medium">
                  Tap to cancel
                </span>
              </div>
            ) : isRecording ? (
              <div className="flex flex-col items-center gap-1 px-3">
                <Square className="w-7 h-7 sm:w-9 sm:h-9 text-white fill-white animate-pulse" />
                <span className="text-sm sm:text-base font-black text-white font-mono tracking-wider">
                  {formatTime(recordingDuration)}
                </span>
                <span className="text-[10px] font-bold text-rose-100 uppercase tracking-wider">
                  Tap to Send
                </span>
              </div>
            ) : isPlayingAudio ? (
              <div className="flex flex-col items-center gap-1.5 px-3">
                <Activity className="w-9 h-9 sm:w-11 sm:h-11 text-emerald-200 animate-pulse" />
                <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                  Speaking...
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 px-3">
                <Mic className="w-11 h-11 sm:w-14 sm:h-14 text-white drop-shadow-md" />
                <span className="text-xs sm:text-sm font-black text-white uppercase tracking-widest drop-shadow">
                  Tap to Talk
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Soundwave bars during voice input */}
        {isRecording && (
          <div className="flex items-center justify-center gap-1 h-7 px-4 py-1 rounded-full bg-slate-900/90 border border-rose-500/40 shadow-lg flex-shrink-0">
            {waveformData.slice(0, 20).map((val, i) => (
              <div
                key={i}
                className="w-1 bg-gradient-to-t from-rose-500 to-orange-400 rounded-full transition-all duration-75"
                style={{ height: `${Math.max(4, val * 22)}px` }}
              />
            ))}
          </div>
        )}

        {/* Response & Captions Box */}
        <div className="response-card-surface flex-shrink min-h-[90px] w-full">
          {/* User Prompt Tag */}
          {latestUserPrompt && (
            <div className="flex items-center gap-2 mb-2 min-w-0">
              <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/30 text-[10px] sm:text-xs font-black text-blue-300 uppercase tracking-wide flex-shrink-0">
                You
              </span>
              <p className="text-xs sm:text-sm text-slate-200 font-semibold truncate min-w-0 flex-1">
                {latestUserPrompt}
              </p>
            </div>
          )}

          {/* Assistant Response Output */}
          <div className="text-xs sm:text-sm md:text-base text-slate-100 leading-relaxed font-medium max-h-28 sm:max-h-36 md:max-h-48 overflow-y-auto pr-1 break-words [overflow-wrap:anywhere]">
            {processingStatus ? (
              <div className="flex items-center gap-2 text-blue-300 font-semibold py-1">
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                <span>{processingStatus}</span>
              </div>
            ) : latestResponse ? (
              <p className="whitespace-pre-wrap">{latestResponse}</p>
            ) : (
              <p className="text-slate-400 italic">
                "Hello! Tap the orb to talk, or select a topic below."
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Pinned Bottom Action Deck (Strictly 1 Row, 3 Cards) ── */}
      <div className="w-full pt-2 pb-[max(12px,env(safe-area-inset-bottom))] flex-shrink-0">
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          {/* Action 1: Top News */}
          <button
            onClick={() => onQuickPrompt?.('Tell me the top breaking news headlines right now.')}
            disabled={isProcessing}
            className="bottom-action-card hover:bg-blue-600/20 hover:border-blue-400/40 text-white transition-all disabled:opacity-40 group"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <Newspaper className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            </div>
            <span className="text-xs sm:text-sm font-semibold">Top News</span>
            <span className="text-[10px] text-slate-400 hidden md:inline">Headlines</span>
          </button>

          {/* Action 2: Weather */}
          <button
            onClick={() => onQuickPrompt?.('What is the weather today in Bengaluru?')}
            disabled={isProcessing}
            className="bottom-action-card hover:bg-amber-600/20 hover:border-amber-400/40 text-white transition-all disabled:opacity-40 group"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <CloudSun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            </div>
            <span className="text-xs sm:text-sm font-semibold">Weather</span>
            <span className="text-[10px] text-slate-400 hidden md:inline">Forecast</span>
          </button>

          {/* Action 3: Notes */}
          <button
            onClick={() => onQuickPrompt?.('What are my current family notes?')}
            disabled={isProcessing}
            className="bottom-action-card hover:bg-emerald-600/20 hover:border-emerald-400/40 text-white transition-all disabled:opacity-40 group"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <StickyNote className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </div>
            <span className="text-xs sm:text-sm font-semibold">Notes</span>
            <span className="text-[10px] text-slate-400 hidden md:inline">Family Board</span>
          </button>
        </div>
      </div>
    </div>
  );
}
