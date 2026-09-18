/**
 * NotesPanel — Cohesive, beautifully balanced Family Notes sheet.
 * Perfectly harmonized with Ollie's design language:
 * - Clean header with subtle count badge
 * - Non-clipping horizontal category filter pills
 * - Single-line sleek compose bar with inline category picker
 * - Natural reading card hierarchy (text primary, metadata footer)
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  StickyNote,
  Plus,
  Trash2,
  X,
  Sparkles,
  ShoppingBag,
  CheckSquare,
  Bell,
  FileText,
  Clock,
  User,
  Loader2,
  ChevronDown,
  Check,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, emoji: '🛒' },
  { id: 'todo', label: 'To-Do', icon: CheckSquare, emoji: '✅' },
  { id: 'reminder', label: 'Reminders', icon: Bell, emoji: '⏰' },
  { id: 'general', label: 'General', icon: FileText, emoji: '📝' },
];

export default function NotesPanel({ isOpen, onClose }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('shopping');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close custom dropdown on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isDropdownOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchNotes();
    }
  }, [isOpen]);

  // Keep compose category synced when switching tabs (unless 'all')
  useEffect(() => {
    if (selectedCategory !== 'all') {
      setNewCategory(selectedCategory);
    }
  }, [selectedCategory]);

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

  const handleAddNote = async (e) => {
    e?.preventDefault();
    const content = newContent.trim();
    if (!content || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          category: newCategory,
          author: 'Family',
        }),
      });
      if (res.ok) {
        setNewContent('');
        await fetchNotes();
      }
    } catch (e) {
      console.error('Failed to add note:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (id) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete note:', e);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredNotes = useMemo(() => {
    if (selectedCategory === 'all') return notes;
    return notes.filter((n) => (n.category || 'general').toLowerCase() === selectedCategory);
  }, [notes, selectedCategory]);

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr.replace(' ', 'T'));
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-out Drawer Panel */}
      <div
        className="relative w-full max-w-lg sm:max-w-xl md:max-w-2xl h-full notes-drawer-surface flex flex-col z-10 select-none overflow-hidden"
        style={{ animation: 'notesSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
      >
        {/* ── Top Header ── */}
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-400/25 flex items-center justify-center shadow-md flex-shrink-0">
              <StickyNote className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight font-['Outfit']">
                  Family Notes
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-slate-300">
                  {notes.length}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Shared family board & voice reminders
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-slate-300 hover:text-white flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
            title="Close Notes"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Category Filter Pills ── */}
        <div className="notes-filter-bar flex-shrink-0">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            const count =
              cat.id === 'all'
                ? notes.length
                : notes.filter((n) => (n.category || 'general').toLowerCase() === cat.id).length;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`notes-filter-chip ${isActive ? 'active' : ''}`}
              >
                <span>{cat.emoji || '✨'}</span>
                <span>{cat.label}</span>
                {count > 0 && <span className="notes-filter-count">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* ── Streamlined Single-Line Compose Bar ── */}
        <form onSubmit={handleAddNote} className="notes-compose-bar flex-shrink-0">
          {/* Custom Floating Category Dropdown */}
          <div className="relative flex-shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="notes-category-trigger-btn"
              title="Select note category"
            >
              <span>{CATEGORIES.find((c) => c.id === newCategory)?.emoji || '📝'}</span>
              <span>{CATEGORIES.find((c) => c.id === newCategory)?.label || 'General'}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180 text-white' : ''
                }`}
              />
            </button>

            {/* Floating Glassmorphic Menu */}
            {isDropdownOpen && (
              <div className="notes-dropdown-menu animate-fade-in">
                {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
                  const isSelected = newCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setNewCategory(cat.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`notes-dropdown-item ${isSelected ? 'selected' : ''}`}
                    >
                      <span className="text-base">{cat.emoji}</span>
                      <span className="flex-1 text-left font-medium">{cat.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Add a new family note..."
            className="notes-compose-input"
          />

          <button
            type="submit"
            disabled={!newContent.trim() || isSubmitting}
            className="notes-compose-add-btn"
            title="Add note"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </form>

        {/* ── Notes List ── */}
        <div className="flex-1 overflow-y-auto px-6 py-2 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <span className="text-sm font-medium">Loading family notes...</span>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3 text-2xl shadow-inner">
                📝
              </div>
              <p className="text-base font-bold text-slate-200">
                {selectedCategory === 'all'
                  ? 'No notes yet'
                  : `No ${selectedCategory} notes found`}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
                Add one above, or speak to Ollie anytime saying{' '}
                <span className="text-blue-300 font-semibold">"Save a note: ..."</span>
              </p>
            </div>
          ) : (
            filteredNotes.map((note) => {
              const catKey = (note.category || 'general').toLowerCase();
              const catConfig =
                CATEGORIES.find((c) => c.id === catKey) || CATEGORIES[4];
              const isDeleting = deletingId === note.id;

              return (
                <div
                  key={note.id}
                  className={`note-item-card ${
                    isDeleting ? 'opacity-40 scale-98 pointer-events-none' : ''
                  }`}
                >
                  {/* Primary: Note Content Text */}
                  <p className="note-item-text">
                    {note.content}
                  </p>

                  {/* Secondary: Metadata & Actions Footer */}
                  <div className="note-item-footer">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className={`note-category-badge ${catKey}`}>
                        {catConfig.emoji} {catConfig.label}
                      </span>
                      {note.author && (
                        <>
                          <span className="note-meta-divider">•</span>
                          <span className="note-meta-text flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-500" />
                            <span>{note.author}</span>
                          </span>
                        </>
                      )}
                      {note.created_at && (
                        <>
                          <span className="note-meta-divider">•</span>
                          <span className="note-meta-text flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{formatTimestamp(note.created_at)}</span>
                          </span>
                        </>
                      )}
                    </div>

                    {/* Action: Delete Note */}
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      disabled={isDeleting}
                      className="note-delete-btn"
                      title="Delete Note"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer / Hands-free Voice Tip ── */}
        <div className="px-6 py-3.5 border-t border-white/[0.08] flex-shrink-0">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-blue-500/10 border border-blue-400/20 text-blue-200 text-xs">
            <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0 animate-pulse" />
            <span className="leading-snug">
              Tip: You can say <strong className="text-white">"Save a note: Buy milk"</strong> to add notes hands-free!
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes notesSlideIn {
          from {
            transform: translateX(100%);
            opacity: 0.5;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
