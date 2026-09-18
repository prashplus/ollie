/**
 * ModelSelector — Elevated dialog to choose local Ollama LLM / VLM models.
 * Features:
 * - Smart categorization (Chat LLMs vs Vision vs Embedding)
 * - Elevated glass cards with parameter & VRAM badges
 * - Smooth radio/active check indicators
 * - Un-cropped footer with active model indicator
 */

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Cpu,
  Check,
  Sparkles,
  RefreshCw,
  Zap,
  Eye,
  Loader2,
  HardDrive,
  Layers,
} from 'lucide-react';

export default function ModelSelector({
  isOpen,
  onClose,
  activeTextModel,
  activeVisionModel,
  onModelChange,
}) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingModel, setUpdatingModel] = useState(null);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'vision' | 'all'

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      setModels(data.models || []);
    } catch (e) {
      console.error('Failed to fetch models:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchModels();
    }
  }, [isOpen]);

  const handleSelectTextModel = async (modelName, isEmbedding = false) => {
    if (isEmbedding) return;
    if (modelName === activeTextModel) return;
    setUpdatingModel(modelName);
    try {
      const res = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text_model: modelName }),
      });
      const data = await res.json();
      onModelChange?.(data.active_text_model, data.active_vision_model);
    } catch (e) {
      console.error('Failed to switch model:', e);
    } finally {
      setUpdatingModel(null);
    }
  };

  // Classify model type
  const categorizedModels = useMemo(() => {
    return models.map((m) => {
      const name = m.name.toLowerCase();
      const isEmbed = name.includes('embed') || m.family?.toLowerCase().includes('bert');
      const isVision = name.includes('llava') || name.includes('vision') || name.includes('vl');
      return {
        ...m,
        isEmbed,
        isVision,
        isChat: !isEmbed && !isVision,
      };
    });
  }, [models]);

  const filteredModels = useMemo(() => {
    if (activeTab === 'chat') return categorizedModels.filter((m) => m.isChat);
    if (activeTab === 'vision') return categorizedModels.filter((m) => m.isVision);
    return categorizedModels;
  }, [categorizedModels, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Dialog Shell */}
      <div className="model-modal-dialog">
        {/* ── Header ── */}
        <div className="model-modal-header">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center shadow-md shadow-blue-500/15 flex-shrink-0">
              <Cpu className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight font-['Outfit']">
                  Local AI Models
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-white/[0.08] border border-white/[0.1] text-[11px] font-semibold text-slate-300">
                  Ollama
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Switch active model powered by local GPU
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={fetchModels}
              disabled={loading}
              className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-slate-300 hover:text-white flex items-center justify-center transition-all active:scale-95"
              title="Refresh installed models"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-slate-300 hover:text-white flex items-center justify-center transition-all active:scale-95"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Category Filter Tabs ── */}
        <div className="model-modal-tabs">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
              activeTab === 'chat'
                ? 'bg-blue-600 border border-blue-400 text-white shadow-md shadow-blue-600/30'
                : 'bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Chat LLMs</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {categorizedModels.filter((m) => m.isChat).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('vision')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
              activeTab === 'vision'
                ? 'bg-blue-600 border border-blue-400 text-white shadow-md shadow-blue-600/30'
                : 'bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Vision</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {categorizedModels.filter((m) => m.isVision).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
              activeTab === 'all'
                ? 'bg-blue-600 border border-blue-400 text-white shadow-md shadow-blue-600/30'
                : 'bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 hover:text-white'
            }`}
          >
            <span>All Models</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {categorizedModels.length}
            </span>
          </button>
        </div>

        {/* ── Models List (Generous, un-cropped scrollable container) ── */}
        <div className="model-modal-list">
          {loading && models.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <span>Scanning local Ollama repository...</span>
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="py-14 text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-3 text-2xl">
                ⚡
              </div>
              <p className="text-base font-bold text-slate-200">No {activeTab} models found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Run <code className="px-1.5 py-0.5 rounded bg-black/50 text-blue-300 font-mono">ollama pull qwen3.5:4b</code> in your terminal to install.
              </p>
            </div>
          ) : (
            filteredModels.map((m) => {
              const isActive = m.name === activeTextModel;
              const isUpdating = updatingModel === m.name;

              // Type icon & style
              let Icon = Zap;
              let iconBg = 'bg-blue-500/15 border-blue-400/25 text-blue-400';
              if (m.isVision) {
                Icon = Eye;
                iconBg = 'bg-purple-500/15 border-purple-400/25 text-purple-300';
              } else if (m.isEmbed) {
                Icon = Layers;
                iconBg = 'bg-slate-500/15 border-slate-400/25 text-slate-400';
              } else if (m.name.toLowerCase().includes('gemma')) {
                Icon = Sparkles;
                iconBg = 'bg-emerald-500/15 border-emerald-400/25 text-emerald-300';
              }

              return (
                <button
                  key={m.name}
                  onClick={() => handleSelectTextModel(m.name, m.isEmbed)}
                  disabled={isUpdating || m.isEmbed}
                  className={`model-card-item ${isActive ? 'active' : ''}`}
                >
                  {/* Left: Icon & Details */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl border flex items-center justify-center flex-shrink-0 transition-transform ${iconBg}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm sm:text-base text-white tracking-tight">
                          {m.name}
                        </span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-600 text-[10px] font-black text-white uppercase tracking-wider shadow-sm shadow-blue-500/40">
                            Active
                          </span>
                        )}
                        {m.isVision && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-[10px] font-bold text-purple-300">
                            Vision
                          </span>
                        )}
                        {m.isEmbed && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-500/20 border border-slate-400/30 text-[10px] font-bold text-slate-400">
                            Embedding
                          </span>
                        )}
                      </div>

                      {/* Technical Badges Row */}
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400 flex-wrap">
                        {m.size_gb && (
                          <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[11px] font-medium text-slate-300">
                            {m.size_gb} GB
                          </span>
                        )}
                        {m.parameter_size && (
                          <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[11px] font-medium text-slate-300">
                            {m.parameter_size}
                          </span>
                        )}
                        {m.family && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            • {m.family}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: State Indicator */}
                  <div className="flex-shrink-0 pl-2">
                    {isActive ? (
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/40">
                        <Check className="w-4 h-4" />
                      </div>
                    ) : isUpdating ? (
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                    ) : m.isEmbed ? (
                      <span className="text-[11px] text-slate-500 font-medium">Vector only</span>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-white/20 hover:border-white/40 transition-colors" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* ── Footer Info (Guaranteed visible, flex-shrink-0) ── */}
        <div className="model-modal-footer">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-slate-400 flex-shrink-0">Active Model:</span>
            <span className="font-bold text-blue-300 bg-blue-500/15 border border-blue-400/30 px-2.5 py-0.5 rounded-lg truncate">
              {activeTextModel || 'qwen3.5:4b'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md shadow-blue-600/30 active:scale-95 flex-shrink-0"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
