/**
 * useAudioRecorder — Robust MediaRecorder hook with cross-browser audio capture (Chrome, Safari, Firefox).
 * Supports Android Chrome, iOS Safari (audio/mp4), and desktop browsers.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [waveformData, setWaveformData] = useState(new Array(32).fill(0));
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [permissionError, setPermissionError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const startTimeRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const updateWaveform = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    const bars = 32;
    const step = Math.max(1, Math.floor(bufferLength / bars));
    const normalized = [];
    for (let i = 0; i < bars; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += dataArray[i * step + j] || 0;
      }
      normalized.push((sum / step) / 255);
    }
    setWaveformData(normalized);

    animFrameRef.current = requestAnimationFrame(updateWaveform);
  }, []);

  const getSupportedMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/aac',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  const startRecording = useCallback(async () => {
    try {
      setPermissionError(null);

      // Request mic stream with high-quality voice parameters
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      startTimeRef.current = Date.now();
      setRecordingDuration(0);

      // Track duration
      timerIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 500);

      // Set up AudioContext for real-time waveform visualization
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
          }
          const source = audioContextRef.current.createMediaStreamSource(stream);
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          source.connect(analyserRef.current);
          updateWaveform();
        }
      } catch (audioCtxErr) {
        console.warn('AudioContext setup warning:', audioCtxErr);
      }

      // Initialize MediaRecorder
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const actualType = recorder.mimeType || mimeType || 'audio/webm';
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: actualType });
          if (blob.size > 100) {
            setAudioBlob(blob);
          }
        }
        chunksRef.current = [];
      };

      recorder.start(100); // 100ms slices for responsive recording
      setIsRecording(true);

    } catch (err) {
      console.error('Failed to start recording:', err);
      setPermissionError(err.message || 'Microphone access denied or unavailable.');
      setIsRecording(false);
    }
  }, [updateWaveform]);

  const stopRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping MediaRecorder:', e);
      }
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
      analyserRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setWaveformData(new Array(32).fill(0));
  }, []);

  const cancelRecording = useCallback(() => {
    chunksRef.current = [];
    stopRecording();
    setAudioBlob(null);
  }, [stopRecording]);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  return {
    isRecording,
    waveformData,
    audioBlob,
    recordingDuration,
    permissionError,
    startRecording,
    stopRecording,
    cancelRecording,
    clearAudioBlob: () => setAudioBlob(null),
  };
}
