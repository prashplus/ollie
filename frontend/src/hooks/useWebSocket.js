/**
 * useWebSocket — Manages WebSocket connection to the Ollie backend.
 * Auto-connects, auto-reconnects with exponential backoff, message queuing.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;

export function useWebSocket() {
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connected' | 'connecting' | 'disconnected'
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef(null);
  const messageQueue = useRef([]);

  const getWsUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws/interact`;
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');
    const url = getWsUrl();

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;

        // Flush queued messages
        while (messageQueue.current.length > 0) {
          const msg = messageQueue.current.shift();
          ws.send(msg);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        wsRef.current = null;
        scheduleReconnect();
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws.close();
      };
    } catch (e) {
      console.error('WebSocket connection failed:', e);
      setConnectionStatus('disconnected');
      scheduleReconnect();
    }
  }, [getWsUrl]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts.current),
      RECONNECT_MAX_DELAY
    );
    reconnectAttempts.current += 1;
    reconnectTimeout.current = setTimeout(connect, delay);
  }, [connect]);

  const sendMessage = useCallback((message) => {
    const msgStr = typeof message === 'string' ? message : JSON.stringify(message);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(msgStr);
    } else {
      messageQueue.current.push(msgStr);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    reconnectAttempts.current = 999; // Prevent reconnect
    wsRef.current?.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      reconnectAttempts.current = 999;
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { sendMessage, lastMessage, connectionStatus, disconnect, reconnect: connect };
}
