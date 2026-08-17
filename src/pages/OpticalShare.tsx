import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Camera, QrCode } from 'lucide-react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';

export default function OpticalShare() {
  const [textToEncode, setTextToEncode] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [scannedText, setScannedText] = useState('Point camera at QR code...');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);

  const generateQR = async () => {
    if (!textToEncode) return alert('Enter text to generate QR');
    try {
      const url = await QRCode.toDataURL(textToEncode);
      setQrUrl(url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate QR code.');
    }
  };

  const startScanning = async () => {
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        requestAnimationFrame(scanFrame);
      }
    } catch (err) {
      alert('Camera access denied or not available.');
      setIsScanning(false);
    }
  };

  const scanFrame = () => {
    if (!isScanning) return;
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          setScannedText(code.data);
          setIsScanning(false);
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          return;
        }
      }
    }
    requestAnimationFrame(scanFrame);
  };

  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6">
        <ArrowLeft /> Back
      </button>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Camera /> Optical Share</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 p-6 rounded-2xl">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><QrCode /> Generate QR</h2>
          <textarea 
            value={textToEncode} 
            onChange={(e) => setTextToEncode(e.target.value)} 
            className="w-full h-24 p-3 bg-slate-800 rounded-lg mb-4 outline-none resize-none border border-slate-700" 
            placeholder="Enter text or link to encode..."
          />
          <button onClick={generateQR} className="w-full py-3 bg-indigo-600 rounded-lg font-semibold hover:bg-indigo-700">Generate</button>
          {qrUrl && <img src={qrUrl} alt="Generated QR Code" className="w-48 h-48 mx-auto mt-4 bg-white p-2 rounded-lg" />}
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Camera /> Scan QR</h2>
          {!isScanning ? (
            <button onClick={startScanning} className="w-full py-3 bg-slate-700 rounded-lg font-semibold hover:bg-slate-600">Start Camera Scan</button>
          ) : (
            <div className="relative aspect-square w-full bg-black rounded-lg overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}
          <div className="mt-4 p-4 bg-slate-800 rounded-lg text-sm text-slate-300 break-all">
            <strong>Result:</strong> {scannedText}
          </div>
        </div>
      </div>
    </div>
  );
}
