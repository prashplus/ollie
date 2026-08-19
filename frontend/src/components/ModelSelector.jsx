/**
 * ModelSelector — Modal to dynamically choose local Ollama LLM / VLM models.
 */

import { useState, useEffect } from 'react';
import { X, Cpu, Check, Sparkles, RefreshCw, Zap } from 'lucide-react';

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

  const handleSelectTextModel = async (modelName) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-slate-900/95 border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Ollama Models</h2>
              <p className="text-xs text-slate-400">Switch active model on your RTX GPU</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchModels}
              disabled={loading}
              className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/15 text-slate-300 transition-all active:scale-95"
              title="Refresh Models"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/15 text-slate-300 transition-all active:scale-95"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Models List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading && models.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
              <span>Checking installed Ollama models...</span>
            </div>
          ) : models.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              No models found in Ollama. Run <code className="text-blue-400">ollama pull llama3.1:8b</code>
            </div>
          ) : (
            models.map((m) => {
              const isActive = m.name === activeTextModel;
              const isUpdating = updatingModel === m.name;
              const isGemma = m.name.toLowerCase().includes('gemma');
              const isLlama = m.name.toLowerCase().includes('llama');

              return (
                <button
                  key={m.name}
                  onClick={() => handleSelectTextModel(m.name)}
                  disabled={isUpdating}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 active:scale-[0.98] ${
                    isActive
                      ? 'bg-blue-600/20 border-blue-500/60 shadow-lg shadow-blue-500/10'
                      : 'bg-slate-800/70 border-white/10 hover:bg-slate-800 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isActive
                          ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                          : isGemma
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : isLlama
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      <Zap className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white truncate">{m.name}</span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-500 text-[10px] font-black text-white uppercase tracking-wider">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {m.size_gb ? `${m.size_gb} GB` : ''} {m.parameter_size ? `• ${m.parameter_size}` : ''} {m.family ? `• ${m.family}` : ''}
                      </p>
                    </div>
                  </div>

                  {isActive ? (
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  ) : isUpdating ? (
                    <RefreshCw className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-white/10 bg-slate-950/50 flex items-center justify-between text-xs text-slate-400">
          <span>Active: <strong className="text-blue-400">{activeTextModel || 'Default'}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
