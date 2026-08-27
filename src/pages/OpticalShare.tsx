import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { ArrowLeft, Camera, QrCode, ScanLine } from 'lucide-react';
import { useToast } from '../components/Toaster';

export default function OpticalShare() {
  const navigate = useNavigate();
  const toast = useToast();
  const [text, setText] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [scanned, setScanned] = useState('Waiting for scan…');
  const [cameraOn, setCameraOn] = useState(false);
  const scanningRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stopCamera = () => {
    scanningRef.current = false;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  };

  useEffect(() => stopCamera, []);

  const generateQr = async () => {
    if (!text.trim()) return toast('Type some text to encode first.', 'err');
    if (text.length > 1000) return toast('Too long for one QR — split it up (≤1000 chars).', 'err');
    try {
      setQrUrl(await QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 2 }));
    } catch {
      toast('QR generation failed.', 'err');
    }
  };

  const startScan = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      });
      setScanned('Waiting for scan…');
      setCameraOn(true);
      await new Promise<void>((res) => setTimeout(res, 30)); // let <video> mount
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.muted = true;
      await video.play();
      scanningRef.current = true;
      requestAnimationFrame(scanFrame);
    } catch {
      toast('Camera denied or unavailable.', 'err');
      setCameraOn(false);
    }
  };

  const scanFrame = () => {
    if (!scanningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState >= video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(data.data, data.width, data.height, { inversionAttempts: 'dontInvert' });
        if (code?.data) {
          setScanned(code.data);
          scanningRef.current = false;
          (video.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());
          setCameraOn(false);
          return;
        }
      }
    }
    requestAnimationFrame(scanFrame);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6"><ArrowLeft /> Back</button>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Camera className="text-amber-400" /> Optical Transfer</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><QrCode className="text-amber-400" /> Generate QR</h2>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Text or link to encode…"
            className="w-full h-24 p-3 bg-slate-800 rounded-lg mb-4 outline-none resize-none border border-slate-700 text-sm focus:ring-2 ring-indigo-500" />
          <button onClick={generateQr} className="w-full py-3 bg-indigo-600 rounded-lg font-semibold hover:bg-indigo-700">Generate</button>
          {qrUrl && <img src={qrUrl} alt="QR code" className="w-48 h-48 mx-auto mt-4 bg-white p-2 rounded-lg" />}
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><ScanLine className="text-amber-400" /> Scan QR</h2>
          {!cameraOn ? (
            <button onClick={startScan} className="w-full py-3 bg-slate-700 rounded-lg font-semibold hover:bg-slate-600">Start Camera Scan</button>
          ) : (
            <div className="relative aspect-square w-full bg-black rounded-lg overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
              <button onClick={stopCamera} className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 text-xs bg-black/70 rounded-lg">Stop</button>
            </div>
          )}
          <div className="mt-4 p-4 bg-slate-800 rounded-lg text-sm text-slate-300 break-all">
            <strong>Result:</strong> {scanned}
          </div>
        </div>
      </div>
    </div>
  );
}
