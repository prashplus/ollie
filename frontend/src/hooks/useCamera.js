/**
 * useCamera — Camera capture hook using getUserMedia.
 * Supports rear camera (environment facing) with frame capture to base64 JPEG.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export function useCamera() {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Rear camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      setPermissionGranted(true);
      setIsCameraActive(true);

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Failed to start camera:', err);
      setPermissionGranted(false);
      setIsCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isCameraActive) return null;

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 JPEG (quality 0.85 for good size/quality balance)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64 = dataUrl.split(',')[1];

    setCapturedImage(dataUrl);
    return base64;
  }, [isCameraActive]);

  const clearCapture = useCallback(() => {
    setCapturedImage(null);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return {
    videoRef,
    isCameraActive,
    capturedImage,
    permissionGranted,
    startCamera,
    stopCamera,
    captureFrame,
    clearCapture,
  };
}
