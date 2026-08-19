/**
 * ChatFeed — Responsive chat message feed with safe curved-screen gutters,
 * guaranteed text-wrapping (no bubble overflow), and formatted markdown.
 */

import { useEffect, useRef } from 'react';
import { User, Bot, Image as ImageIcon, Sparkles, Newspaper, CloudSun, StickyNote, Clock } from 'lucide-react';

export default function ChatFeed({ messages, onSuggestionClick }) {
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const quickPrompts = [
    { label: '📰 Today\'s News', icon: Newspaper, query: 'Tell me the top current news headlines right now.' },
    { label: '🌦️ Weather in BLR', icon: CloudSun, query: 'What is the weather in Bengaluru today?' },
    { label: '📝 Save a Note', icon: StickyNote, query: 'Save a note: Buy groceries this evening' },
    { label: '⏰ Set Timer', icon: Clock, query: 'Remind me in 15 minutes to take a break' },
  ];

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 text-center select-none overflow-y-auto max-w-md mx-auto w-full">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-blue-500/30 via-indigo-500/25 to-violet-600/30 border border-white/20 flex items-center justify-center mb-4 shadow-2xl animate-pulse-glow">
          <span className="text-3xl sm:text-4xl">🏠</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">
          Welcome to Ollie
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xs sm:max-w-sm leading-relaxed mb-6">
          Your private, local multimodal assistant. Ask for live news, weather, notes, reminders, or point your camera.
        </p>

        {/* Suggestion Grid */}
        <div className="w-full max-w-xs sm:max-w-sm flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 px-1 mb-0.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Suggested prompts:</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {quickPrompts.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.label}
                  onClick={() => onSuggestionClick?.(p.query)}
                  className="px-3.5 py-3 rounded-2xl text-xs font-semibold text-slate-100 bg-slate-800/90 border border-white/15 hover:bg-blue-600/30 hover:border-blue-400/50 hover:text-white transition-all text-left flex items-center gap-2 shadow-md active:scale-95"
                >
                  <Icon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="truncate">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 space-y-4 max-w-3xl mx-auto w-full">
      {messages.map((msg, i) => (
        <MessageBubble key={i} message={msg} index={i} />
      ))}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
}

function MessageBubble({ message, index }) {
  const isUser = message.role === 'user';
  const isTyping = message.typing;

  return (
    <div
      className={`flex gap-2.5 sm:gap-3 items-end animate-fade-in ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
      style={{ animationDelay: `${Math.min(index * 20, 100)}ms` }}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-600 border border-white/25 flex items-center justify-center shadow-md mb-1">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Bubble + Metadata Container */}
      <div className={`max-w-[82%] sm:max-w-[74%] min-w-0 flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Attached image preview */}
        {message.image && (
          <div className="mb-2">
            <div className="relative inline-block rounded-2xl overflow-hidden border border-white/20 shadow-xl">
              <img
                src={message.image}
                alt="Captured visual"
                className="w-48 h-36 sm:w-60 sm:h-44 object-cover"
              />
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/80 backdrop-blur-md rounded-lg px-2 py-0.5 border border-white/15">
                <ImageIcon className="w-3 h-3 text-white" />
                <span className="text-[10px] font-bold text-white">Camera Frame</span>
              </div>
            </div>
          </div>
        )}

        {/* Text bubble */}
        <div
          className={`px-4 py-3 rounded-2xl sm:rounded-3xl text-sm leading-relaxed break-words [overflow-wrap:anywhere] shadow-lg min-w-0 max-w-full overflow-hidden ${
            isUser
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-sm border border-blue-400/20'
              : 'bg-slate-800/95 backdrop-blur-2xl border border-white/15 text-slate-100 rounded-bl-sm'
          }`}
        >
          {isTyping ? (
            <div className="flex items-center gap-1.5 py-1 px-1">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
          ) : (
            <FormattedText content={message.content} isUser={isUser} />
          )}
        </div>

        {/* Timestamp */}
        {message.timestamp && (
          <span className="text-[10px] text-slate-400 mt-1 px-1 select-none">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 border border-white/25 flex items-center justify-center shadow-md mb-1">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
}

/**
 * FormattedText — Render styled bold, bullet lists, numbered points, and clean paragraphs.
 */
function FormattedText({ content, isUser }) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className="space-y-1.5 min-w-0 max-w-full">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Bullet point (starts with •, -, *)
        if (/^[•\-\*]\s+/.test(trimmed)) {
          const text = trimmed.replace(/^[•\-\*]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 py-0.5 min-w-0">
              <span className="text-blue-400 font-bold text-base leading-none flex-shrink-0">•</span>
              <span className="flex-1 min-w-0 break-words [overflow-wrap:anywhere]">{renderInlineStyles(text)}</span>
            </div>
          );
        }

        // Numbered list item (e.g. 1. or 2.)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 py-0.5 min-w-0">
              <span className="px-1.5 py-0.5 rounded-md bg-blue-500/25 text-blue-300 font-bold text-[11px] leading-none flex-shrink-0">
                {numMatch[1]}
              </span>
              <span className="flex-1 min-w-0 break-words [overflow-wrap:anywhere]">{renderInlineStyles(numMatch[2])}</span>
            </div>
          );
        }

        return <p key={idx} className="break-words [overflow-wrap:anywhere] min-w-0">{renderInlineStyles(line)}</p>;
      })}
    </div>
  );
}

function renderInlineStyles(text) {
  if (!text) return null;

  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-white break-words">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-black/50 text-blue-300 font-mono text-[12px] border border-white/10 break-all">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
