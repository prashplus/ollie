/**
 * NotesPanel — Slide-out panel showing family notes with add/delete.
 */

import { useState, useEffect } from 'react';
import { StickyNote, Plus, Trash2, X, ChevronRight } from 'lucide-react';

export default function NotesPanel({ isOpen, onClose }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) fetchNotes();
  }, [isOpen]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      setNotes(data.notes || []);
    } catch (e) {
      console.error('Failed to fetch notes:', e);
    } finally {
      setLoading(false);
    }
  };

  const categoryColors = {
    shopping: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    todo: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    reminder: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    general: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  };

  const categoryEmojis = {
    shopping: '🛒',
    todo: '✅',
    reminder: '⏰',
    general: '📝',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-sm h-full glass-card-strong border-l border-white/10 animate-slide-up overflow-hidden flex flex-col"
        style={{ animation: 'slideInRight 0.3s ease-out forwards' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <StickyNote className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-text-primary">Family Notes</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-12">
              <StickyNote className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="text-sm text-text-muted">No notes yet</p>
              <p className="text-xs text-text-muted mt-1">Ask Ollie to save a note for you!</p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="glass-card p-3 rounded-xl animate-fade-in"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary leading-relaxed">{note.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${categoryColors[note.category] || categoryColors.general}`}>
                        {categoryEmojis[note.category] || '📝'} {note.category}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        by {note.author}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-[11px] text-text-muted text-center">
            Say "Save a note: ..." to add notes via Ollie
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
