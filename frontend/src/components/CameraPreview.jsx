/**
 * CameraPreview — Camera toggle, live viewfinder overlay, and capture preview.
 */

import { Camera, CameraOff, Sparkles, X, RefreshCw } from 'lucide-react';

export default function CameraPreview({
  videoRef,
  isCameraActive,
  capturedImage,
  onStartCamera,
  onStopCamera,
  onCapture,
  onClearCapture,
  permissionGranted,
}) {
  return (
    <div className="relative">
      {/* Camera Open / Captured Thumbnail Button */}
      {!isCameraActive && !capturedImage && (
        <button
          onClick={onStartCamera}
          disabled={permissionGranted === false}
          className={`
            w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 border
            ${permissionGranted === false
              ? 'bg-slate-800/50 border-white/5 text-slate-600 cursor-not-allowed'
              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white active:scale-95'
            }
          `}
          title={permissionGranted === false ? 'Camera access denied' : 'Open Camera for Vision'}
        >
          <Camera className="w-5 h-5" />
        </button>
      )}

      {/* Captured Image Preview thumbnail */}
      {capturedImage && !isCameraActive && (
        <div className="relative">
          <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-blue-500 shadow-md">
            <img src={capturedImage} alt="Captured preview" className="w-full h-full object-cover" />
          </div>
          <button
            onClick={onClearCapture}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow hover:bg-red-600 transition-colors"
            title="Remove Photo"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Camera Active Viewfinder Overlay */}
      {isCameraActive && (
        <>
          {/* Active Camera toggle button */}
          <button
            onClick={onStopCamera}
            className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 text-blue-400 flex items-center justify-center relative shadow-md"
            title="Close camera"
          >
            <Camera className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          {/* Floating Viewfinder Modal / Card */}
          <div className="fixed inset-x-3 bottom-24 sm:absolute sm:bottom-full sm:left-0 sm:right-auto sm:mb-3 z-40 animate-slide-up">
            <div className="bg-slate-900/95 backdrop-blur-2xl p-2.5 rounded-3xl border border-white/15 shadow-2xl max-w-sm mx-auto sm:w-72">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Top close button */}
                <button
                  onClick={onStopCamera}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Bottom Capture Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-center">
                  <button
                    onClick={onCapture}
                    className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/40 active:scale-95 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Look & Explain</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
