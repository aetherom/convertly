import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, Download, Image as ImageIcon } from 'lucide-react';

export default function ImageEditor() {
  const location = useLocation();
  const [imgSrc, setImgSrc] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [filter, setFilter] = useState<string>('none');

  useEffect(() => {
    if (!location.state || !location.state.file) {
      window.location.href = '/';
      return;
    }
    const file = location.state.file as File;
    const reader = new FileReader();
    reader.onload = (e) => setImgSrc(e.target?.result as string);
    reader.readAsDataURL(file);
  }, [location.state]);

  useEffect(() => {
    if (imgSrc && canvasRef.current) {
      const img = new Image();
      img.src = imgSrc;
      img.onload = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.filter = filter;
            ctx.drawImage(img, 0, 0);
          }
        }
      };
    }
  }, [imgSrc, filter]);

  const handleExport = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'edited-image.png';
        a.click();
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 text-slate-400 hover:text-white">
          <ArrowLeft /> Back
        </button>
        <div className="flex gap-2">
          <select onChange={(e) => setFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none">
            <option value="none">Original</option>
            <option value="grayscale(100%)">Grayscale</option>
            <option value="invert(100%)">Invert</option>
            <option value="sepia(100%)">Sepia</option>
            <option value="blur(5px)">Blur</option>
          </select>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="flex justify-center items-center min-h-[60vh] bg-slate-900 rounded-2xl p-4 overflow-auto">
        {imgSrc ? <canvas ref={canvasRef} className="max-w-full h-auto rounded-lg" /> : <p className="text-slate-500 flex items-center gap-2"><ImageIcon /> Loading Image...</p>}
      </div>
    </div>
  );
}
