/**
 * Dashboard — Main layout orchestrating WebSocket, audio recording, camera, chat,
 * model switcher, and Voice-First Kiosk Home Mode.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, Newspaper, CloudSun, StickyNote, Clock } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useCamera } from '../hooks/useCamera';
import { blobToBase64, base64ToAudioUrl } from '../utils/audioUtils';
import StatusBar from './StatusBar';
import ChatFeed from './ChatFeed';
import VoiceHome from './VoiceHome';
import VoiceButton from './VoiceButton';
import CameraPreview from './CameraPreview';
import NotesPanel from './NotesPanel';
import ModelSelector from './ModelSelector';

export default function Dashboard() {
  // ── State ────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [processingStatus, setProcessingStatus] = useState('');
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [notesCount, setNotesCount] = useState(0);
  const [config, setConfig] = useState(null);
  const [activeModel, setActiveModel] = useState('llama3.1:8b');
  const [activeVisionModel, setActiveVisionModel] = useState('llava:7b');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [viewMode, setViewMode] = useState('home'); // 'home' (voice kiosk) or 'chat' (log feed)

  const inputRef = useRef(null);
  const pendingImageRef = useRef(null);
  const currentAudioRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isAudioPlayingRef = useRef(false);
  const processingTimeoutRef = useRef(null);

  // ── Quick Action Chips ───────────────────────────────────
  const quickActions = [
    { label: 'News', icon: Newspaper, query: 'Tell me the latest breaking news headlines.' },
    { label: 'Weather', icon: CloudSun, query: 'What is the weather today in Bengaluru?' },
    { label: 'Notes', icon: StickyNote, query: 'What are my current family notes?' },
    { label: 'Time', icon: Clock, query: 'What is the exact local time and date?' },
  ];

  // ── Hooks ────────────────────────────────────────────────
  const { sendMessage, lastMessage, connectionStatus } = useWebSocket();
  const {
    isRecording, waveformData, audioBlob, recordingDuration,
    permissionError, startRecording, stopRecording, cancelRecording,
    clearAudioBlob,
  } = useAudioRecorder();
  const {
    videoRef, isCameraActive, capturedImage,
    startCamera, stopCamera, captureFrame, clearCapture,
    permissionGranted: camPermission,
  } = useCamera();

  // ── Manual & Auto Cancel Processing ──────────────────────
  const handleCancelProcessing = useCallback(() => {
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
    setIsProcessing(false);
    setProcessingStatus('');
    setMessages(prev => prev.filter(m => !m.typing));
  }, []);

  // ── Fetch config & notes count & models on mount ─────────
  const fetchNotesCount = useCallback(() => {
    fetch('/api/notes')
      .then(r => r.json())
      .then(data => setNotesCount(data.notes?.length || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/models')
      .then(r => r.json())
      .then(data => {
        if (data.active_text_model) setActiveModel(data.active_text_model);
        if (data.active_vision_model) setActiveVisionModel(data.active_vision_model);
      })
      .catch(() => {});

    fetch('/api/config')
      .then(r => r.json())
      .then(setConfig)
      .catch(() => {});

    fetchNotesCount();
  }, [fetchNotesCount]);

  // ── Audio playback queue handler ──────────────────────────
  const processAudioQueue = useCallback(async () => {
    if (isAudioPlayingRef.current || audioQueueRef.current.length === 0 || isMuted) return;

    isAudioPlayingRef.current = true;
    setIsPlayingAudio(true);

    while (audioQueueRef.current.length > 0) {
      const base64Data = audioQueueRef.current.shift();
      try {
        const url = base64ToAudioUrl(base64Data);
        await new Promise((resolve) => {
          const audio = new Audio(url);
          currentAudioRef.current = audio;
          audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.play().catch(resolve);
        });
      } catch (e) {
        console.error('Audio playback error:', e);
      }
    }

    isAudioPlayingRef.current = false;
    setIsPlayingAudio(false);
  }, [isMuted]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      if (next && currentAudioRef.current) {
        currentAudioRef.current.pause();
        audioQueueRef.current = [];
        isAudioPlayingRef.current = false;
        setIsPlayingAudio(false);
      }
      return next;
    });
  }, []);

  // ── Process incoming WebSocket messages ───────────────────
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case 'text_complete':
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
          processingTimeoutRef.current = null;
        }
        setMessages(prev => {
          const filtered = prev.filter(m => !m.typing);
          return [...filtered, {
            role: 'assistant',
            content: lastMessage.content,
            timestamp: Date.now(),
          }];
        });
        setIsProcessing(false);
        setProcessingStatus('');
        fetchNotesCount();
        break;

      case 'transcript':
        setMessages(prev => [...prev, {
          role: 'user',
          content: lastMessage.content,
          timestamp: Date.now(),
        }]);
        setMessages(prev => [...prev, { role: 'assistant', typing: true }]);
        break;

      case 'audio_chunk':
        if (!isMuted) {
          audioQueueRef.current.push(lastMessage.data);
          processAudioQueue();
        }
        break;

      case 'status':
        setProcessingStatus(lastMessage.content || '');
        break;

      case 'reminder':
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: lastMessage.content,
          timestamp: Date.now(),
        }]);
        break;

      case 'error':
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
          processingTimeoutRef.current = null;
        }
        setMessages(prev => {
          const filtered = prev.filter(m => !m.typing);
          return [...filtered, {
            role: 'assistant',
            content: `⚠️ ${lastMessage.content}`,
            timestamp: Date.now(),
          }];
        });
        setIsProcessing(false);
        setProcessingStatus('');
        break;
    }
  }, [lastMessage, isMuted, processAudioQueue, fetchNotesCount]);

  // Reset processing on disconnect
  useEffect(() => {
    if (connectionStatus !== 'connected') {
      handleCancelProcessing();
    }
  }, [connectionStatus, handleCancelProcessing]);

  // ── Handle audio blob (from voice recording) ─────────────
  useEffect(() => {
    if (!audioBlob) return;

    const sendAudio = async () => {
      try {
        setIsProcessing(true);
        if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = setTimeout(() => {
          handleCancelProcessing();
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '⚠️ Voice processing took too long. Please tap to try again.',
            timestamp: Date.now(),
          }]);
        }, 28000);

        const base64 = await blobToBase64(audioBlob);
        sendMessage({ type: 'audio', data: base64 });
      } catch (e) {
        console.error('Failed to send audio:', e);
        handleCancelProcessing();
      }
      clearAudioBlob();
    };

    sendAudio();
  }, [audioBlob, sendMessage, clearAudioBlob, handleCancelProcessing]);

  // ── Send text message ────────────────────────────────────
  const sendQuery = useCallback((textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg = {
      role: 'user',
      content: text,
      timestamp: Date.now(),
      image: capturedImage || null,
    };
    setMessages(prev => [...prev, userMsg]);
    setMessages(prev => [...prev, { role: 'assistant', typing: true }]);
    setIsProcessing(true);

    if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
    processingTimeoutRef.current = setTimeout(() => {
      handleCancelProcessing();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Request took too long to complete. Please try asking again.',
        timestamp: Date.now(),
      }]);
    }, 28000);

    if (pendingImageRef.current || capturedImage) {
      const imgBase64 = pendingImageRef.current || capturedImage.split(',')[1];
      sendMessage({ type: 'image', data: imgBase64, prompt: text });
      pendingImageRef.current = null;
      clearCapture();
    } else {
      sendMessage({ type: 'text', content: text });
    }

    setInputText('');
  }, [inputText, capturedImage, sendMessage, clearCapture, handleCancelProcessing]);

  const handleSendText = () => sendQuery();

  // ── Handle camera capture ────────────────────────────────
  const handleCameraCapture = useCallback(() => {
    const base64 = captureFrame();
    if (base64) {
      pendingImageRef.current = base64;
      stopCamera();
    }
  }, [captureFrame, stopCamera]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  // Find latest assistant answer and user prompt for Kiosk Home Mode
  const latestAssistantMsg = messages.filter(m => m.role === 'assistant' && !m.typing).slice(-1)[0]?.content || '';
  const latestUserMsg = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';

  return (
    <div className="h-full flex flex-col gradient-mesh overflow-hidden">
      {/* Top Header Bar */}
      <StatusBar
        connectionStatus={connectionStatus}
        processingStatus={processingStatus}
        config={config}
        onOpenNotes={() => setIsNotesOpen(true)}
        notesCount={notesCount}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        isPlayingAudio={isPlayingAudio}
        onCancelProcessing={handleCancelProcessing}
        activeModel={activeModel}
        onOpenModelSelector={() => setIsModelSelectorOpen(true)}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode(prev => prev === 'home' ? 'chat' : 'home')}
      />

      {/* Main View Area: Voice Home vs Chat Log Feed */}
      {viewMode === 'home' ? (
        <VoiceHome
          isRecording={isRecording}
          isProcessing={isProcessing}
          isPlayingAudio={isPlayingAudio}
          processingStatus={processingStatus}
          waveformData={waveformData}
          recordingDuration={recordingDuration}
          latestResponse={latestAssistantMsg}
          latestUserPrompt={latestUserMsg}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onCancelProcessing={handleCancelProcessing}
          onQuickPrompt={(prompt) => sendQuery(prompt)}
          onStartCamera={startCamera}
          onSwitchToChat={() => setViewMode('chat')}
          activeModel={activeModel}
          onOpenModelSelector={() => setIsModelSelectorOpen(true)}
        />
      ) : (
        <>
          {/* Main Chat Feed */}
          <ChatFeed
            messages={messages}
            onSuggestionClick={(query) => sendQuery(query)}
          />

          {/* Bottom Action Bar Dock */}
          <div className="safe-bottom px-4 sm:px-8 pb-3 pt-1 z-10 space-y-2">
            {/* Quick Action Chips */}
            {messages.length > 0 && (
              <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-0.5 px-1 max-w-2xl mx-auto">
                {quickActions.map((qa) => {
                  const Icon = qa.icon;
                  return (
                    <button
                      key={qa.label}
                      onClick={() => sendQuery(qa.query)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-white/20 hover:bg-blue-600/30 hover:border-blue-400/60 text-slate-100 text-xs font-semibold backdrop-blur-md shadow-md transition-all active:scale-95 flex-shrink-0"
                    >
                      <Icon className="w-3.5 h-3.5 text-blue-400" />
                      <span>{qa.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Floating Input Dock */}
            <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/15 p-2 rounded-3xl shadow-2xl max-w-2xl mx-auto">
              <div className="flex items-center gap-2">
                {/* Camera Capture Action */}
                <CameraPreview
                  videoRef={videoRef}
                  isCameraActive={isCameraActive}
                  capturedImage={capturedImage}
                  onStartCamera={startCamera}
                  onStopCamera={stopCamera}
                  onCapture={handleCameraCapture}
                  onClearCapture={() => { clearCapture(); pendingImageRef.current = null; }}
                  permissionGranted={camPermission}
                />

                {/* Expandable Text Input */}
                <div className="flex-1 relative flex items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isRecording ? 'Listening to voice...' : isProcessing ? 'Ollie is thinking...' : 'Ask Ollie anything...'}
                    className="w-full px-4 py-2.5 rounded-2xl bg-white/[0.07] border border-white/10 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.12] transition-all"
                  />
                </div>

                {/* Smart Action Button */}
                {inputText.trim().length > 0 ? (
                  <button
                    onClick={handleSendText}
                    className="w-10 h-10 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex-shrink-0"
                    title="Send Message"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                ) : (
                  <VoiceButton
                    isRecording={isRecording}
                    isProcessing={isProcessing && !isRecording}
                    waveformData={waveformData}
                    recordingDuration={recordingDuration}
                    onStartRecording={startRecording}
                    onStopRecording={stopRecording}
                    onCancelRecording={cancelRecording}
                    onCancelProcessing={handleCancelProcessing}
                    permissionError={permissionError}
                    compact={true}
                  />
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Notes Slide-out Panel */}
      <NotesPanel
        isOpen={isNotesOpen}
        onClose={() => {
          setIsNotesOpen(false);
          fetchNotesCount();
        }}
      />

      {/* Model Switcher Modal */}
      <ModelSelector
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        activeTextModel={activeModel}
        activeVisionModel={activeVisionModel}
        onModelChange={(newText, newVision) => {
          if (newText) setActiveModel(newText);
          if (newVision) setActiveVisionModel(newVision);
        }}
      />
    </div>
  );
}
