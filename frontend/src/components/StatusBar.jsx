/**
 * StatusBar — Spacious navigation header with large 44px+ touch targets,
 * safe curved-screen inset gutters, model selector, and mode switcher.
 */

import { Wifi, WifiOff, Loader2, StickyNote, Volume2, VolumeX, Activity, X, Zap, MessageSquare, Home } from 'lucide-react';

export default function StatusBar({
  connectionStatus,
  processingStatus,
  config,
  onOpenNotes,
  notesCount,
  isMuted,
  onToggleMute,
  isPlayingAudio,
  onCancelProcessing,
  activeModel,
  onOpenModelSelector,
  viewMode,
  onToggleViewMode,
}) {
  const isOnline = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';

  return (
    <header className="safe-top px-3 sm:px-6 pt-2 pb-1 z-20">
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-xl">
        {/* Left: App Logo + Model Switcher */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-600 border border-white/25 flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
            <span className="text-white font-black text-base">O</span>
          </div>

          {/* Model Selector Pill (Large Touch Target) */}
          <button
            onClick={onOpenModelSelector}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/[0.09] hover:bg-blue-600/30 border border-white/15 text-slate-100 hover:text-white transition-all active:scale-95 text-xs font-bold shadow-sm"
            title="Click to Switch Model"
          >
            <Zap className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="truncate max-w-[85px] sm:max-w-[130px]">{activeModel || 'llama3.1'}</span>
          </button>
        </div>

        {/* Center: Live processing or speaking status banner */}
        {processingStatus ? (
          <button
            onClick={onCancelProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/25 border border-blue-400/40 shadow-md animate-fade-in text-left transition-all active:scale-95 group"
            title="Tap to Cancel"
          >
            <Loader2 className="w-3.5 h-3.5 text-blue-300 animate-spin flex-shrink-0 group-hover:hidden" />
            <X className="w-3.5 h-3.5 text-red-400 hidden group-hover:inline flex-shrink-0" />
            <span className="text-[11px] text-blue-100 group-hover:text-red-200 font-bold truncate max-w-[80px] sm:max-w-[150px]">
              {processingStatus}
            </span>
          </button>
        ) : isPlayingAudio ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 animate-fade-in shadow-md">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-[11px] text-emerald-200 font-bold">Speaking...</span>
          </div>
        ) : null}

        {/* Right Controls: Big Touch Buttons (Min 40-44px) */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher: Home Kiosk <-> Chat Feed */}
          {onToggleViewMode && (
            <button
              onClick={onToggleViewMode}
              className={`w-10 h-10 rounded-2xl border transition-all active:scale-95 flex items-center justify-center ${
                viewMode === 'home'
                  ? 'bg-blue-600/25 border-blue-500/50 text-blue-300 shadow-md shadow-blue-500/20'
                  : 'bg-white/[0.09] hover:bg-white/15 border-white/15 text-slate-200'
              }`}
              title={viewMode === 'home' ? 'Switch to Chat Log' : 'Switch to Voice Home'}
            >
              {viewMode === 'home' ? <MessageSquare className="w-5 h-5" /> : <Home className="w-5 h-5 text-blue-400" />}
            </button>
          )}

          {/* Notes Drawer Button */}
          <button
            onClick={onOpenNotes}
            className="relative w-10 h-10 rounded-2xl bg-white/[0.09] hover:bg-white/15 border border-white/15 text-slate-200 transition-all active:scale-95 flex items-center justify-center"
            title="Family Notes"
          >
            <StickyNote className="w-5 h-5 text-amber-300" />
            {notesCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shadow-md border-2 border-slate-900">
                {notesCount}
              </span>
            )}
          </button>

          {/* Audio Output Mute / Unmute Button */}
          <button
            onClick={onToggleMute}
            className={`w-10 h-10 rounded-2xl border transition-all active:scale-95 flex items-center justify-center ${
              isPlayingAudio
                ? 'bg-emerald-500/25 border-emerald-400/40 text-emerald-300 shadow-md shadow-emerald-500/20'
                : isMuted
                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'bg-white/[0.09] hover:bg-white/15 border-white/15 text-slate-200'
            }`}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-slate-200" />}
          </button>
        </div>
      </div>
    </header>
  );
}
