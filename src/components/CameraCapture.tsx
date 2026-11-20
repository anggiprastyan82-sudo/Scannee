import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, RefreshCw, X, Zap, ZapOff, Scan, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface CameraCaptureProps {
  onCapture: (file: File, dataUrl: string) => void;
  onCancel: () => void;
}

export default function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [resolution, setResolution] = useState<{ width: number; height: number } | null>(null);
  const [flashAnimation, setFlashAnimation] = useState(false);

  // Stop current stream tracks cleanly
  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopTracks();
    setErrorMessage(null);
    setHasPermission(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasPermission(false);
      setErrorMessage("Media stream capabilities not supported in this browser environment.");
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(console.error);
            setResolution({
              width: videoRef.current.videoWidth,
              height: videoRef.current.videoHeight,
            });
          }
        };
      }

      setHasPermission(true);

      // Inspect torch support if available
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities?.() as any) || {};
        if (capabilities.torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setHasPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage("Camera access denied. Please grant camera permission in your browser settings to scan documents.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage("No functional camera device detected on this system.");
      } else {
        setErrorMessage(err.message || "Failed to initialize camera stream.");
      }
    }
  }, [facingMode, stopTracks]);

  useEffect(() => {
    startCamera();
    return () => {
      stopTracks();
    };
  }, [startCamera, stopTracks]);

  // Toggle torch / flash
  const toggleTorch = async () => {
    if (!streamRef.current || !hasTorch) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (e) {
        console.warn("Could not toggle torch:", e);
      }
    }
  };

  // Flip camera between environment (back) and user (front)
  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture frame from video feed
  const snapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    setIsCapturing(true);
    setFlashAnimation(true);

    setTimeout(() => {
      setFlashAnimation(false);
    }, 150);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setIsCapturing(false);
      return;
    }

    // Draw frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        setIsCapturing(false);
        if (!blob) return;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `document_scan_${timestamp}.jpg`;
        const file = new File([blob], filename, { type: 'image/jpeg' });

        // Stop stream before delivering captured photo
        stopTracks();
        onCapture(file, dataUrl);
      },
      'image/jpeg',
      0.95
    );
  };

  return (
    <div className="relative border-2 border-ink bg-black rounded-lg overflow-hidden flex flex-col text-bg">
      {/* Top Telemetry Header */}
      <div className="bg-ink/90 border-b border-ink/40 px-4 py-2 flex items-center justify-between font-mono text-[11px] select-none z-20">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="tracking-wider uppercase font-semibold text-bg">OPTICAL SCANNER FEED</span>
          {resolution && (
            <span className="opacity-60 hidden sm:inline">
              [{resolution.width}×{resolution.height}]
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="opacity-60 uppercase hidden md:inline">
            FACING: {facingMode.toUpperCase()}
          </span>
          <button
            onClick={() => {
              stopTracks();
              onCancel();
            }}
            className="p-1 hover:bg-white/10 rounded transition-colors text-bg"
            title="Close camera"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Viewport Area */}
      <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-black flex items-center justify-center overflow-hidden">
        {flashAnimation && (
          <div className="absolute inset-0 bg-white z-40 pointer-events-none transition-opacity duration-150 opacity-90" />
        )}

        {/* Video feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "w-full h-full object-cover",
            facingMode === 'user' && "scale-x-[-1]"
          )}
        />

        {/* Camera Permission / Error State */}
        {hasPermission === false && (
          <div className="absolute inset-0 bg-ink/95 flex flex-col items-center justify-center p-6 text-center z-30 space-y-4">
            <CameraOff className="w-12 h-12 text-red-400 opacity-80" />
            <div className="max-w-md space-y-2">
              <h3 className="font-serif italic text-lg text-bg">Camera Access Required</h3>
              <p className="font-mono text-xs opacity-75 text-bg leading-relaxed">
                {errorMessage || "Unable to access optical sensor. Please ensure your browser allows camera access for this domain."}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-bg text-ink font-mono text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-2 rounded"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Connection
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-bg/40 text-bg font-mono text-xs uppercase tracking-wider hover:bg-white/10 transition-colors rounded"
              >
                Switch to File Upload
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {hasPermission === null && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 z-20 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-bg opacity-70" />
            <p className="font-mono text-xs uppercase tracking-widest text-bg animate-pulse">
              INITIALIZING OPTICAL STREAM...
            </p>
          </div>
        )}

        {/* Viewfinder Target Reticle & Scan Overlay */}
        {hasPermission && (
          <div className="absolute inset-0 pointer-events-none z-10 p-6 sm:p-10 flex flex-col justify-between">
            {/* Corner Reticles */}
            <div className="relative w-full h-full border border-white/20 rounded">
              {/* Top-Left Corner */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-white" />
              {/* Top-Right Corner */}
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-white" />
              {/* Bottom-Left Corner */}
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-white" />
              {/* Bottom-Right Corner */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-white" />

              {/* Animated Laser Scanning Line */}
              <div className="absolute left-0 right-0 h-[2px] bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse top-1/2 -translate-y-1/2" />

              {/* Centered Guide Prompt */}
              <div className="absolute inset-x-0 bottom-4 flex justify-center">
                <span className="bg-black/60 backdrop-blur-sm px-3 py-1 text-[10px] font-mono tracking-widest uppercase text-bg/90 border border-white/15 rounded">
                  ALIGN DOCUMENT WITHIN RETICLE MARKS
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Camera Control Deck */}
      <div className="bg-ink p-4 flex items-center justify-between gap-4 z-20">
        {/* Left Option: Torch or Torch Status */}
        <div className="w-24 flex items-center">
          {hasTorch ? (
            <button
              onClick={toggleTorch}
              className={cn(
                "p-2.5 rounded-full border transition-colors flex items-center gap-1 font-mono text-[10px]",
                torchOn
                  ? "bg-yellow-400 text-ink border-yellow-300"
                  : "bg-white/10 text-bg border-white/20 hover:bg-white/20"
              )}
              title="Toggle flashlight/torch"
            >
              {torchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
            </button>
          ) : (
            <div className="text-[10px] font-mono text-bg/40 uppercase hidden sm:block">
              SENSOR READY
            </div>
          )}
        </div>

        {/* Center: Large Shutter Button */}
        <div className="flex items-center justify-center">
          <button
            onClick={snapPhoto}
            disabled={!hasPermission || isCapturing}
            className={cn(
              "group relative flex items-center justify-center w-16 h-16 rounded-full border-4 border-bg transition-transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer",
              "hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]"
            )}
            title="Snap photo of document"
          >
            <div className="w-11 h-11 rounded-full bg-red-600 group-hover:bg-red-500 transition-colors flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </button>
        </div>

        {/* Right Options: Flip Camera & Cancel */}
        <div className="w-24 flex items-center justify-end gap-2">
          <button
            onClick={flipCamera}
            disabled={!hasPermission}
            className="p-2.5 rounded-full bg-white/10 text-bg border border-white/20 hover:bg-white/20 transition-colors disabled:opacity-40"
            title="Switch front / rear camera"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              stopTracks();
              onCancel();
            }}
            className="p-2.5 rounded-full bg-white/10 text-bg border border-white/20 hover:bg-white/20 transition-colors sm:hidden"
            title="Cancel scan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
