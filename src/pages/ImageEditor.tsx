import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Download, ArrowLeft, RotateCw, RotateCcw, FlipHorizontal, FlipVertical, 
  PenTool, Eraser, Type, ZoomIn, ZoomOut, Maximize, Layers, Undo2, Redo2 
} from 'lucide-react';

export default function ImageEditor() {
  const location = useLocation();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [fileName, setFileName] = useState('untitled');
  
  const [filters, setFilters] = useState({ brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, blur: 0, invert: 0, rotate: 0, flipH: 1, flipV: 1 });
  const [zoom, setZoom] = useState(100);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#ff0000');
  const [brushSize, setBrushSize] = useState(5);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  useEffect(() => {
    const file = location.state?.file as File | undefined;
    if (file) {
      setFileName(file.name.split('.')[0]);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setTimeout(initCanvas, 100);
    }
  }, [location.state]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.lineCap = 'round';
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctxRef.current = ctx;
    saveHistory();
  };

  const saveHistory = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (historyStep < history.length - 1) {
      setHistory(history.slice(0, historyStep + 1));
    }
    setHistory([...history, data]);
    setHistoryStep(historyStep + 1);
  };

  const restoreHistory = (step: number) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.putImageData(history[step], 0, 0);
  };

  const undo = () => { if (historyStep > 0) { setHistoryStep(historyStep - 1); restoreHistory(historyStep - 1); } };
  const redo = () => { if (historyStep < history.length - 1) { setHistoryStep(historyStep + 1); restoreHistory(historyStep + 1); } };

  const startDraw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const ctx = ctxRef.current; if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const ctx = ctxRef.current; if (!ctx) return;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  const endDraw = () => { if (isDrawing) saveHistory(); };

  const clearCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveHistory();
  };

  const addText = () => {
    const text = prompt("Enter text:");
    if (!text) return;
    const ctx = ctxRef.current; if (!ctx) return;
    ctx.fillStyle = brushColor;
    ctx.font = `${brushSize * 4}px Arial`;
    ctx.fillText(text, 50, 50);
    saveHistory();
  };

  const handleExport = (format: string) => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      const mergeCanvas = document.createElement('canvas');
      mergeCanvas.width = img.width; mergeCanvas.height = img.height;
      const mergeCtx = mergeCanvas.getContext('2d');
      if (mergeCtx) {
        mergeCtx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%) blur(${filters.blur}px) invert(${filters.invert}%)`;
        mergeCtx.translate(img.width / 2, img.height / 2);
        mergeCtx.scale(filters.flipH, filters.flipV);
        mergeCtx.rotate(filters.rotate * Math.PI / 180);
        mergeCtx.drawImage(img, -img.width / 2, -img.height / 2);
        
        if (canvasRef.current) {
          mergeCtx.filter = 'none';
          mergeCtx.drawImage(canvasRef.current, 0, 0, img.width, img.height);
        }
      }
      const ext = format === 'jpg' ? 'image/jpeg' : 'image/png';
      mergeCanvas.toBlob(blob => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `${fileName}.${format}`; a.click();
          URL.revokeObjectURL(url);
        }
      }, ext, 0.9);
    };
  };

  const imageFilterStyle = {
    filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%) blur(${filters.blur}px) invert(${filters.invert}%)`,
    transform: `rotate(${filters.rotate}deg) scale(${filters.flipH}, ${filters.flipV}) scale(${zoom / 100})`
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex justify-between items-center sticky top-0 z-50 shadow-md no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div className="flex items-center gap-2 text-purple-400">
            <Layers className="w-5 h-5" />
            <h1 className="font-bold text-lg hidden sm:block text-slate-100">Image Studio</h1>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => handleExport('png')} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-500 flex items-center gap-2">
            <Download className="w-4 h-4" /> Save PNG
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Tools */}
        <div className="w-64 bg-slate-800 border-r border-slate-700 p-4 flex flex-col gap-4 overflow-y-auto no-print">
          <div className="flex gap-2">
            <button onClick={undo} className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-600"><Undo2 className="w-4 h-4" /></button>
            <button onClick={redo} className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-600"><Redo2 className="w-4 h-4" /></button>
          </div>

          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Adjust</h3>
          <Slider label="Brightness" value={filters.brightness} min={0} max={200} onChange={v => setFilters({...filters, brightness: v})} />
          <Slider label="Contrast" value={filters.contrast} min={0} max={200} onChange={v => setFilters({...filters, contrast: v})} />
          <Slider label="Saturate" value={filters.saturate} min={0} max={200} onChange={v => setFilters({...filters, saturate: v})} />
          <Slider label="Grayscale" value={filters.grayscale} min={0} max={100} onChange={v => setFilters({...filters, grayscale: v})} />
          <Slider label="Sepia" value={filters.sepia} min={0} max={100} onChange={v => setFilters({...filters, sepia: v})} />
          <Slider label="Blur" value={filters.blur} min={0} max={10} onChange={v => setFilters({...filters, blur: v})} />
          
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-4">Transform</h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setFilters({...filters, rotate: filters.rotate + 90})} className="flex items-center justify-center gap-2 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-600"><RotateCw className="w-4 h-4" /></button>
            <button onClick={() => setFilters({...filters, rotate: filters.rotate - 90})} className="flex items-center justify-center gap-2 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-600"><RotateCcw className="w-4 h-4" /></button>
            <button onClick={() => setFilters({...filters, flipH: filters.flipH === 1 ? -1 : 1})} className="flex items-center justify-center gap-2 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-600"><FlipHorizontal className="w-4 h-4" /></button>
            <button onClick={() => setFilters({...filters, flipV: filters.flipV === 1 ? -1 : 1})} className="flex items-center justify-center gap-2 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-600"><FlipVertical className="w-4 h-4" /></button>
          </div>

          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-4">Draw & Text</h3>
          <div className="flex gap-2">
            <button onClick={() => setIsDrawing(!isDrawing)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors ${isDrawing ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
              <PenTool className="w-4 h-4" /> Draw
            </button>
            <button onClick={clearCanvas} className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-600">
              <Eraser className="w-4 h-4" /> Clear
            </button>
          </div>
          <button onClick={addText} className="w-full flex items-center justify-center gap-2 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-600">
            <Type className="w-4 h-4" /> Add Text
          </button>
          
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Color:</label>
            <input type="color" value={brushColor} onChange={e => { setBrushColor(e.target.value); if(ctxRef.current) ctxRef.current.strokeStyle = e.target.value; }} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
            <input type="range" min="1" max="20" value={brushSize} onChange={e => { setBrushSize(Number(e.target.value)); if(ctxRef.current) ctxRef.current.lineWidth = Number(e.target.value); }} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
          </div>
        </div>

        {/* Center Canvas */}
        <div className="flex-1 bg-slate-950 flex items-center justify-center overflow-hidden relative">
          {imageUrl && (
            <div className="relative" style={{ width: '80%', height: '80%' }}>
              <img src={imageUrl} alt="Editor" className="max-w-full max-h-full object-contain shadow-2xl transition-all duration-300 pointer-events-none absolute inset-0" style={imageFilterStyle} />
              <canvas 
                ref={canvasRef} 
                onMouseDown={startDraw} 
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                className={`absolute inset-0 w-full h-full ${isDrawing ? 'cursor-crosshair' : 'pointer-events-none'}`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Zoom Bar */}
      <footer className="bg-slate-800 border-t border-slate-700 px-4 py-2 flex justify-center items-center gap-4 no-print">
        <button onClick={() => setZoom(Math.max(10, zoom - 10))} className="p-2 hover:bg-slate-700 rounded-md text-slate-300"><ZoomOut className="w-4 h-4" /></button>
        <span className="text-xs text-slate-400 w-12 text-center">{zoom}%</span>
        <button onClick={() => setZoom(Math.min(400, zoom + 10))} className="p-2 hover:bg-slate-700 rounded-md text-slate-300"><ZoomIn className="w-4 h-4" /></button>
        <button onClick={() => setZoom(100)} className="p-2 hover:bg-slate-700 rounded-md text-slate-300 ml-4"><Maximize className="w-4 h-4" /></button>
      </footer>
    </div>
  );
}

const Slider = ({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) => (
  <div>
    <div className="flex justify-between mb-1">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <span className="text-xs text-slate-500">{value}</span>
    </div>
    <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
  </div>
);
