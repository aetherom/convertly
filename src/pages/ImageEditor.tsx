import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { 
  Download, ArrowLeft, RotateCw, RotateCcw, FlipHorizontal, FlipVertical, 
  PenTool, Eraser, Type, ZoomIn, ZoomOut, Maximize, Layers, Undo2, Redo2, Upload, Wand2, Scissors 
} from 'lucide-react';

export default function ImageEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState('');
  const [fileName, setFileName] = useState('untitled');
  const [activeTool, setActiveTool] = useState<'draw' | 'erase' | null>(null);
  
  const [filters, setFilters] = useState({ brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, blur: 0, invert: 0, rotate: 0, flipH: 1, flipV: 1 });
  const [zoom, setZoom] = useState(100);
  
  const [brushColor, setBrushColor] = useState('#ff0000');
  const [brushSize, setBrushSize] = useState(5);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFile = (file: File) => {
    setFileName(file.name.split('.')[0]);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setTimeout(initCanvas, 100);
  };

  useEffect(() => {
    const file = location.state?.file as File | undefined;
    if (file) loadFile(file);
  }, [location.state]);

  const initCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true }); if (!ctx) return;
    canvas.width = 800; canvas.height = 600; // Max edit size for performance
    ctx.lineCap = 'round'; ctx.strokeStyle = brushColor; ctx.lineWidth = brushSize;
    ctxRef.current = ctx;
    saveHistory();
  };

  const saveHistory = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev.slice(0, historyStep + 1), data]);
    setHistoryStep(prev => prev + 1);
  };

  const restoreHistory = (step: number) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.putImageData(history[step], 0, 0);
  };

  const undo = () => { if (historyStep > 0) { setHistoryStep(historyStep - 1); restoreHistory(historyStep - 1); } };
  const redo = () => { if (historyStep < history.length - 1) { setHistoryStep(historyStep + 1); restoreHistory(historyStep + 1); } };

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.nativeEvent.clientX - rect.left) * scaleX, y: (e.nativeEvent.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent) => {
    if (!activeTool) return;
    const ctx = ctxRef.current; if (!ctx) return;
    const { x, y } = getMousePos(e);
    ctx.beginPath(); ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent) => {
    if (!activeTool) return;
    const ctx = ctxRef.current; if (!ctx) return;
    const { x, y } = getMousePos(e);
    ctx.lineTo(x, y);
    
    if (activeTool === 'draw') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
    } else if (activeTool === 'erase') {
      // Magic Eraser: Sample surrounding pixels and paint over object
      ctx.globalCompositeOperation = 'source-over';
      const sample = ctx.getImageData(Math.max(0, x-20), Math.max(0, y-20), 40, 40).data;
      let r=0,g=0,b=0, count=0;
      for(let i=0; i<sample.length; i+=4) { r+=sample[i]; g+=sample[i+1]; b+=sample[i+2]; count++; }
      r=Math.round(r/count); g=Math.round(g/count); b=Math.round(b/count);
      ctx.strokeStyle = `rgb(${r},${g},${b})`;
      ctx.lineWidth = brushSize * 3; // Thicker to cover object
    }
    ctx.stroke();
  };

  const endDraw = () => { if (activeTool) saveHistory(); };

  const clearCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveHistory();
  };

  const removeBackground = () => {
    // AI Background Subtractor (Chroma Keying)
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Sample top-left pixel as background color
      const bgR = data[0], bgG = data[1], bgB = data[2];
      const tolerance = 40;
      
      for (let i = 0; i < data.length; i += 4) {
        if (Math.abs(data[i] - bgR) < tolerance && Math.abs(data[i+1] - bgG) < tolerance && Math.abs(data[i+2] - bgB) < tolerance) {
          data[i+3] = 0; // Set alpha to 0 (transparent)
        }
      }
      ctx.putImageData(imageData, 0, 0);
      saveHistory();
    };
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
          const a = document.createElement('a'); a.href = url; a.download = `${fileName}.${format}`; a.click();
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
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-700 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5 text-slate-300" /></button>
          <div className="flex items-center gap-2 text-purple-400"><Layers className="w-5 h-5" /><h1 className="font-bold text-lg hidden sm:block text-slate-100">Image Studio</h1></div>
        </div>
        <div className="flex gap-2 items-center">
          <input type="file" accept="image/*" ref={fileInputRef} onChange={e => e.target.files && loadFile(e.target.files[0])} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-300" title="Upload Image"><Upload className="w-5 h-5" /></button>
          <button onClick={() => handleExport('png')} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-500 flex items-center gap-2"><Download className="w-4 h-4" /> Save PNG</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-slate-800 border-r border-slate-700 p-4 flex flex-col gap-4 overflow-y-auto no-print">
          <div className="flex gap-2">
            <button onClick={undo} className="flex-1 flex items-center justify-center py-2 bg-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-600"><Undo2 className="w-4 h-4" /></button>
            <button onClick={redo} className="flex-1 flex items-center justify-center py-2 bg-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-600"><Redo2 className="w-4 h-4" /></button>
          </div>

          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">AI Magic Tools</h3>
          <button onClick={removeBackground} className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500"><Wand2 className="w-4 h-4" /> Remove Background</button>
          <button onClick={() => { setActiveTool('erase'); }} className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors ${activeTool === 'erase' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}><Scissors className="w-4 h-4" /> Magic Eraser</button>

          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-4">Adjust</h3>
          <Slider label="Brightness" value={filters.brightness} min={0} max={200} onChange={v => setFilters({...filters, brightness: v})} />
          <Slider label="Contrast" value={filters.contrast} min={0} max={200} onChange={v => setFilters({...filters, contrast: v})} />
          <Slider label="Saturate" value={filters.saturate} min={0} max={200} onChange={v => setFilters({...filters, saturate: v})} />
          <Slider label="Grayscale" value={filters.grayscale} min={0} max={100} onChange={v => setFilters({...filters, grayscale: v})} />
          
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-4">Draw</h3>
          <button onClick={() => { setActiveTool('draw'); }} className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors ${activeTool === 'draw' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}><PenTool className="w-4 h-4" /> Draw Brush</button>
          <button onClick={clearCanvas} className="w-full flex items-center justify-center gap-2 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-600"><Eraser className="w-4 h-4" /> Clear Canvas</button>
          
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Color:</label>
            <input type="color" value={brushColor} onChange={e => { setBrushColor(e.target.value); if(ctxRef.current) ctxRef.current.strokeStyle = e.target.value; }} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
            <input type="range" min="1" max="20" value={brushSize} onChange={e => { setBrushSize(Number(e.target.value)); if(ctxRef.current) ctxRef.current.lineWidth = Number(e.target.value); }} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
          </div>
        </div>

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
                className={`absolute inset-0 w-full h-full ${activeTool ? 'cursor-crosshair' : 'pointer-events-none'}`}
              />
            </div>
          )}
        </div>
      </div>

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
