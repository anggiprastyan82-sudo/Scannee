import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Upload, 
  Loader2, 
  Search, 
  FileText, 
  Info, 
  Camera, 
  RotateCcw,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import CameraCapture from './CameraCapture';

interface AnalysisResult {
  isGenuine: boolean;
  confidence: number;
  summary: string;
  findings: {
    category: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  verdict: string;
}

export default function Analyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [captureSource, setCaptureSource] = useState<'upload' | 'camera'>('upload');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      setCaptureSource('upload');
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
      setResult(null);
      setError(null);
      setIsCameraActive(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    multiple: false,
    noClick: false
  });

  const handleCameraCapture = (capturedFile: File, dataUrl: string) => {
    setFile(capturedFile);
    setPreview(dataUrl);
    setCaptureSource('camera');
    setIsCameraActive(false);
    setResult(null);
    setError(null);
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setIsCameraActive(false);
  };

  const analyzeDocument = async () => {
    if (!file || !preview) return;

    setLoading(true);
    setError(null);

    try {
      const base64Data = preview.split(',')[1];
      const mimeType = file.type || 'image/jpeg';

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to analyze document.');
      }

      setResult(data as AnalysisResult);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to analyze document. Please check connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8">
      {/* App Header */}
      <header className="border-b border-ink pb-4 flex flex-col sm:flex-row justify-between sm:items-end gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tighter uppercase italic font-serif">VeriDoc AI</h1>
            <span className="bg-ink text-bg font-mono text-[10px] px-2 py-0.5 uppercase tracking-widest font-semibold rounded">
              v1.2 OPTICAL SCAN
            </span>
          </div>
          <p className="text-xs opacity-60 font-mono mt-1">DOCUMENT AUTHENTICITY & MANIPULATION DETECTOR</p>
        </div>
        <div className="text-left sm:text-right font-mono text-[10px] opacity-60 space-y-0.5">
          <div>ENGINE: GEMINI 3 FLASH + SEARCH GROUNDING</div>
          <div>INPUT MODES: OPTICAL CAMERA & LOCAL FILE</div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Input / Scanner Column */}
        <div className="space-y-4">
          {/* Mode Switcher Tabs */}
          <div className="flex border border-ink bg-ink/5 p-1 rounded font-mono text-xs">
            <button
              onClick={() => {
                setIsCameraActive(false);
              }}
              className={cn(
                "flex-1 py-2 px-3 text-center transition-all rounded flex items-center justify-center gap-2 cursor-pointer",
                !isCameraActive 
                  ? "bg-ink text-bg font-semibold shadow-sm" 
                  : "text-ink/70 hover:text-ink hover:bg-black/5"
              )}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </button>
            <button
              onClick={() => {
                setIsCameraActive(true);
              }}
              className={cn(
                "flex-1 py-2 px-3 text-center transition-all rounded flex items-center justify-center gap-2 cursor-pointer",
                isCameraActive 
                  ? "bg-ink text-bg font-semibold shadow-sm" 
                  : "text-ink/70 hover:text-ink hover:bg-black/5"
              )}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera Scanner</span>
            </button>
          </div>

          {/* Camera Viewport */}
          {isCameraActive && (
            <div className="space-y-2">
              <CameraCapture 
                onCapture={handleCameraCapture}
                onCancel={() => setIsCameraActive(false)}
              />
              <p className="text-[11px] font-mono opacity-60 text-center">
                Position paper or printed document flat under good lighting for optimal optical character and artifact detection.
              </p>
            </div>
          )}

          {/* File Dropzone & Image Preview (when camera is not actively streaming) */}
          {!isCameraActive && (
            <div className="space-y-3">
              <div 
                {...getRootProps()} 
                className={cn(
                  "border-2 border-dashed border-ink/30 rounded-lg p-8 text-center cursor-pointer transition-all hover:border-ink/60 bg-white/40 relative",
                  isDragActive && "bg-ink/10 border-ink",
                  preview && "p-3 border-solid border-ink/40 bg-white/60"
                )}
              >
                <input {...getInputProps()} />
                
                {preview ? (
                  <div className="space-y-3">
                    <div className="relative group max-h-[460px] flex items-center justify-center overflow-hidden rounded border border-ink/20 bg-ink/5">
                      <img 
                        src={preview} 
                        alt="Document Preview" 
                        className="max-h-[440px] w-auto object-contain mx-auto transition-transform group-hover:scale-[1.01]" 
                      />
                      <div className="absolute inset-0 bg-ink/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-bg p-4">
                        <Upload className="w-6 h-6" />
                        <p className="font-mono text-xs uppercase tracking-wider font-semibold">Drop or Click to Replace File</p>
                      </div>
                    </div>

                    {/* Meta bar for the loaded image */}
                    <div className="flex items-center justify-between font-mono text-[11px] px-1 text-ink/70">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-semibold uppercase",
                          captureSource === 'camera' ? "bg-red-100 text-red-800 border border-red-300" : "bg-blue-100 text-blue-800 border border-blue-300"
                        )}>
                          {captureSource === 'camera' ? 'OPTICAL CAMERA CAPTURE' : 'LOCAL UPLOAD'}
                        </span>
                        <span className="truncate max-w-[180px] sm:max-w-[240px]">{file?.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReset();
                        }}
                        className="text-red-600 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                    <div className="w-14 h-14 mx-auto rounded-full bg-ink/5 flex items-center justify-center border border-ink/10">
                      <Upload className="w-6 h-6 opacity-60 text-ink" />
                    </div>
                    <div>
                      <p className="font-serif italic text-lg text-ink">Drag & drop document image here</p>
                      <p className="text-xs opacity-60 font-mono uppercase mt-1">Supports JPG, PNG, WEBP (Up to 15MB)</p>
                    </div>

                    {/* Direct Camera Button in Dropzone */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCameraActive(true);
                        }}
                        className="px-4 py-2.5 bg-ink text-bg font-mono text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-2 rounded cursor-pointer shadow-sm"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Snap Photo with Camera</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {file && !loading && (
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button 
                onClick={analyzeDocument}
                className="flex-1 bg-ink text-bg py-3.5 px-4 font-mono uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2.5 rounded cursor-pointer shadow-md text-sm font-semibold"
              >
                <Search className="w-4 h-4" />
                {result ? "Re-Analyze Document" : "Initialize Analysis"}
              </button>

              <button
                type="button"
                onClick={() => setIsCameraActive(true)}
                className="px-4 py-3 border border-ink/40 bg-white/70 hover:bg-white text-ink font-mono text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 rounded cursor-pointer"
                title="Snap a new photo with camera"
              >
                <Camera className="w-4 h-4" />
                <span>Snap Another</span>
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="w-full border border-ink bg-white/80 p-8 rounded-lg flex flex-col items-center justify-center space-y-4 shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-ink" />
              <div className="text-center space-y-1">
                <p className="font-mono text-xs uppercase tracking-widest font-semibold text-ink animate-pulse">
                  Scanning typography, layout & factual grounding...
                </p>
                <p className="font-mono text-[11px] opacity-60 text-ink">
                  Querying Gemini 3 Flash & cross-referencing public records
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-500 text-red-800 font-mono text-xs flex items-start gap-2.5 rounded">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="space-y-1">
                <p className="font-semibold uppercase tracking-wider">Analysis Failed</p>
                <p className="opacity-90">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Findings / Results Column */}
        <div className="space-y-6">
          {!result && !loading && (
            <div className="h-full min-h-[360px] border border-ink/20 rounded-lg flex flex-col items-center justify-center p-8 text-center bg-white/30 space-y-3">
              <div className="w-16 h-16 rounded-full bg-ink/5 flex items-center justify-center border border-ink/10">
                <FileText className="w-8 h-8 opacity-40 text-ink" />
              </div>
              <div className="max-w-xs space-y-1">
                <p className="font-serif italic text-lg text-ink">Awaiting Document Input</p>
                <p className="text-xs font-mono opacity-50">
                  Take a photo using the live camera interface or drop a document image to initiate forensic verification.
                </p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-400">
              {/* Main Verdict Card */}
              <div className={cn(
                "p-6 border-l-8 rounded-r-lg shadow-sm border",
                result.isGenuine 
                  ? "bg-green-50/90 border-green-600 border-t-green-200 border-r-green-200 border-b-green-200" 
                  : "bg-red-50/90 border-red-600 border-t-red-200 border-r-red-200 border-b-red-200"
              )}>
                <div className="flex items-center gap-3.5 mb-3">
                  {result.isGenuine ? (
                    <CheckCircle className="w-9 h-9 text-green-600 shrink-0" />
                  ) : (
                    <Shield className="w-9 h-9 text-red-600 shrink-0" />
                  )}
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold font-serif italic uppercase tracking-tight text-ink">
                      {result.isGenuine ? "Verified Authentic" : "Suspicious / Manipulated"}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[11px] opacity-60 uppercase">Confidence Rating:</span>
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-black/5 text-ink">
                        {result.confidence}%
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm font-medium leading-relaxed text-ink/90">{result.summary}</p>
              </div>

              {/* Detailed Forensic Findings */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <h3 className="col-header">Forensic Findings Breakdown</h3>
                  <span className="font-mono text-[10px] opacity-50">{result.findings.length} CHECKS PERFORMED</span>
                </div>
                <div className="border border-ink/20 rounded-lg overflow-hidden bg-white/70 shadow-sm">
                  {result.findings.map((finding, idx) => (
                    <div key={idx} className="data-row items-center hover:bg-ink hover:text-bg transition-colors">
                      <div className="flex items-center justify-center">
                        <div 
                          className={cn(
                            "w-2.5 h-2.5 rounded-full shadow-xs",
                            finding.severity === 'high' ? "bg-red-500 ring-2 ring-red-200" : 
                            finding.severity === 'medium' ? "bg-amber-500 ring-2 ring-amber-200" : "bg-blue-500 ring-2 ring-blue-200"
                          )} 
                          title={`Severity: ${finding.severity.toUpperCase()}`}
                        />
                      </div>
                      <div className="text-xs font-mono uppercase opacity-80 tracking-wide">{finding.category}</div>
                      <div className="col-span-2 text-xs font-medium leading-normal">{finding.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Final Verdict Callout */}
              <div className="p-5 border border-ink bg-ink text-bg rounded-lg shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-bg/70" />
                  <h3 className="col-header text-bg/60">Final Conclusive Assessment</h3>
                </div>
                <p className="font-serif italic text-lg leading-snug">{result.verdict}</p>
              </div>

              {/* Grounding & Verification Metadata */}
              <div className="bg-white/60 p-4 rounded-lg border border-ink/15 space-y-1.5">
                <div className="flex items-center gap-2 opacity-60">
                  <Info className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono uppercase font-semibold">Live Grounding & Audit Context</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-75 font-mono">
                  Analysis executed using multi-modal visual inspection with Google Search grounding. Verification compares typographic artifacts, signature alignments, and cross-checks claim data against official press releases and regulatory databases.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-8 border-t border-ink/10 flex flex-col sm:flex-row justify-between items-center gap-3 opacity-40 font-mono text-[9px]">
        <div>© 2026 VERIDOC ANALYTICS GROUP • FORENSIC AI PROTOCOL</div>
        <div className="flex gap-4">
          <span>OPTICAL STREAM: READY</span>
          <span>BROWSER MEDIA STREAM API</span>
        </div>
      </footer>
    </div>
  );
}
