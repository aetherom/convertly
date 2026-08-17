import { useEffect, useRef, useState } from 'react';
import { Camera, X, Copy, Check } from 'lucide-react';

// @ts-ignore
declare let jsQR: any;

export default function OpticalShare() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const animationRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    setIsScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  const startCamera = async () => {
    setError('');
    setScannedData('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsScanning(true);
        tick();
      }
    } catch (err) {
      setError('Camera access denied or not available on this device.');
    }
  };

  const tick = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      
      if (imageData) {
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
        if (code) {
          setScannedData(code.data);
          stopCamera();
          return;
        }
      }
    }
    animationRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => { return () => stopCamera(); }, []);

  const copyData = () => { navigator.clipboard.writeText(scannedData); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-xl bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-700 text-center">
          <Camera className="w-10 h-10 text-amber-400 mx-auto mb-2" />
          <h2 className="text-xl font-bold">Optical Data Transfer</h2>
          <p className="text-sm text-slate-400 mt-1">Scan a Fileverse QR code to transfer data without internet.</p>
        </div>
        <div className="p-8">
          {!isScanning && !scannedData && (
            <button onClick={startCamera} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg font-semibold flex items-center justify-center gap-2"><Camera className="w-5 h-5" /> Start Camera</button>
          )}
          {isScanning && (
            <div className="relative aspect-square w-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-3/4 border-4 border-amber-400 rounded-lg shadow-2xl"></div>
              </div>
              <button onClick={stopCamera} className="absolute top-4 right-4 p-2 bg-slate-900/80 rounded-full hover:bg-slate-800"><X className="w-6 h-6" /></button>
            </div>
          )}
          {scannedData && (
            <div className="space-y-4">
              <div className="bg-green-900/20 border border-green-700 text-green-400 p-4 rounded-lg text-sm text-center"><Check className="w-6 h-6 mx-auto mb-2" /> Data transferred successfully!</div>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-400 mb-2">Received Payload:</p>
                <textarea value={scannedData} readOnly className="w-full h-32 p-2 bg-transparent text-slate-200 text-xs outline-none resize-none" />
                <button onClick={copyData} className="mt-2 flex items-center gap-2 text-amber-400 text-sm font-semibold hover:text-amber-300">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Copy Data</button>
              </div>
              <button onClick={() => { setScannedData(''); startCamera(); }} className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold">Scan Another</button>
            </div>
          )}
          {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}
        </div>
      </div>
    </div>
  );
}
