/**
 * StatusBar — Modern, minimalist pill header.
 * Clean, seamless single-pill design without nested borders or mismatched shapes.
 */

import { Zap, MessageSquare, Mic, StickyNote, Volume2, VolumeX, ChevronDown } from 'lucide-react';

export default function StatusBar({
  connectionStatus,
  onOpenNotes,
  notesCount = 0,
  isMuted,
  onToggleMute,
  isPlayingAudio,
  activeModel,
  onOpenModelSelector,
  viewMode = 'home',
  onToggleViewMode,
}) {
  const isOnline = connectionStatus === 'connected';

  return (
    <header className="safe-top px-4 sm:px-6 pt-2 pb-1 z-30 kiosk-width-constraint flex-shrink-0">
      <div className="app-header-bar w-full">
        {/* Left: Clean Brand Mark */}
        <div className="flex items-center gap-2 sm:gap-2.5 pl-1.5 flex-shrink-0">
          <span className="text-sm sm:text-base font-black text-white tracking-wide font-['Outfit']">
            Ollie
          </span>
          <span
            className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-colors ${
              isOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse' : 'bg-red-400'
            }`}
            title={isOnline ? 'Ollie Online' : 'Connecting to Server...'}
          />
        </div>

        {/* Center: Model Selector Pill */}
        <button
          onClick={onOpenModelSelector}
          className="flex items-center gap-1.5 sm:gap-2 h-7 sm:h-8 px-3 sm:px-4 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.09] text-slate-200 hover:text-white transition-all active:scale-95 text-xs sm:text-sm font-semibold max-w-[150px] sm:max-w-[280px] md:max-w-[360px] truncate shadow-sm"
          title="Switch Active AI Model"
        >
          <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 flex-shrink-0" />
          <span className="truncate">{activeModel || 'qwen3.5:4b'}</span>
          <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 flex-shrink-0" />
        </button>

        {/* Right: 3 Cohesive Circular Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 pr-0.5">
          {/* View Mode Toggle: Voice <-> Chat */}
          {onToggleViewMode && (
            <button
              onClick={onToggleViewMode}
              className={`header-action-btn ${
                viewMode === 'chat'
                  ? 'bg-blue-600 border-blue-400 text-white shadow-sm shadow-blue-500/40'
                  : ''
              }`}
              title={viewMode === 'home' ? 'Switch to Chat Feed' : 'Switch to Voice Kiosk'}
            >
              {viewMode === 'home' ? (
                <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-200" />
              ) : (
                <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              )}
            </button>
          )}

          {/* Family Notes Drawer Button */}
          <button
            onClick={onOpenNotes}
            className="header-action-btn relative"
            title="Family Notes"
          >
            <StickyNote className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
            {notesCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] sm:min-w-[18px] h-[16px] sm:h-[18px] px-1 rounded-full bg-blue-600 text-white text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-md border border-slate-900">
                {notesCount}
              </span>
            )}
          </button>

          {/* Speech Audio Mute Toggle */}
          <button
            onClick={onToggleMute}
            className={`header-action-btn ${
              isPlayingAudio
                ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 animate-pulse'
                : isMuted
                  ? 'border-red-400/40 bg-red-500/20 text-red-400'
                  : ''
            }`}
            title={isMuted ? 'Unmute Voice Output' : 'Mute Voice Output'}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
