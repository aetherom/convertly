import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Download, ArrowLeft, Upload, Layers, Crop, 
  MousePointer2, Lasso, Brush, Eraser, Stamp, ZoomIn, ZoomOut, 
  Unlink, FlipHorizontal, FlipVertical, RotateCw, RotateCcw, SunDim, Contrast
} from 'lucide-react';

export default function ImageEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState('');
  const [fileName, setFileName] = useState('untitled');
  
  // Tools State
  const [activeTool, setActiveTool] = useState('move');
  const [brushSize, setBrushSize] = useState(10);
  const [zoom, setZoom] = useState(100);
  
  // Canvas Refs
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const uiCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // History & Selection
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [selection, setSelection] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const isDrawing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const cloneSource = useRef({ x: 0, y: 0 });

  const loadFile = (file: File) => {
    setFileName(file.name.split('.')[0]);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setTimeout(initCanvases, 100);
  };

  useEffect(() => {
    const file = location.state?.file as File | undefined;
    if (file) loadFile(file);
  }, [location.state]);

  const initCanvases = () => {
    const baseCanvas = baseCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    const uiCanvas = uiCanvasRef.current;
    if (!baseCanvas || !drawCanvas || !uiCanvas) return;

    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      const w = Math.min(800, img.width);
      const h = Math.min(600, img.height);
      [baseCanvas, drawCanvas, uiCanvas].forEach(c => { c.width = w; c.height = h; });
      
      const ctx = baseCanvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      saveHistory();
    };
  };

  const saveHistory = () => {
    const drawCanvas = drawCanvasRef.current; if (!drawCanvas) return;
    const ctx = drawCanvas.getContext('2d'); if (!ctx) return;
    const data = ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    setHistory(prev => [...prev.slice(0, historyStep + 1), data]);
    setHistoryStep(prev => prev + 1);
  };

  const undo = () => {
    if (historyStep <= 0) return;
    const step = historyStep - 1;
    setHistoryStep(step);
    const drawCanvas = drawCanvasRef.current; if (!drawCanvas) return;
    const ctx = drawCanvas.getContext('2d'); if (!ctx) return;
    ctx.putImageData(history[step], 0, 0);
  };

  // Real Pixel Algorithm: Unsharp Mask (Sharpening)
  const applyUnsharpMask = () => {
    const baseCanvas = baseCanvasRef.current; if (!baseCanvas) return;
    const ctx = baseCanvas.getContext('2d'); if (!ctx) return;
    const w = baseCanvas.width, h = baseCanvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const copy = new Uint8ClampedArray(data);
    
    // Simple convolution matrix for sharpening
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          let val = 0;
          let ki = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const pIdx = ((y + ky) * w + (x + kx)) * 4 + c;
              val += copy[pIdx] * kernel[ki++];
            }
          }
          data[idx + c] = Math.min(255, Math.max(0, val));
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  };

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = uiCanvasRef.current; if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.nativeEvent.clientX - rect.left) * scaleX, y: (e.nativeEvent.clientY - rect.top) * scaleY };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getMousePos(e);
    startPos.current = { x, y };
    isDrawing.current = true;

    // Clone Stamp: Alt-Click to set source
    if (activeTool === 'stamp' && e.altKey) {
      cloneSource.current = { x, y };
      isDrawing.current = false;
      return;
    }

    // Selection Tool
    if (activeTool === 'marquee' || activeTool === 'lasso') {
      setSelection({ x, y, w: 0, h: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing.current) return;
    const { x, y } = getMousePos(e);
    const drawCtx = drawCanvasRef.current?.getContext('2d');
    const uiCtx = uiCanvasRef.current?.getContext('2d');
    if (!drawCtx || !uiCtx) return;

    if (activeTool === 'brush' || activeTool === 'eraser') {
      drawCtx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
      drawCtx.lineWidth = brushSize;
      drawCtx.lineCap = 'round';
      drawCtx.strokeStyle = '#ff0000';
      drawCtx.beginPath();
      drawCtx.moveTo(startPos.current.x, startPos.current.y);
      drawCtx.lineTo(x, y);
      drawCtx.stroke();
      startPos.current = { x, y };
    } else if (activeTool === 'stamp') {
      // Clone Stamp Logic
      const dx = x - startPos.current.x;
      const dy = y - startPos.current.y;
      const sx = cloneSource.current.x + dx;
      const sy = cloneSource.current.y + dy;
      
      const baseCtx = baseCanvasRef.current?.getContext('2d');
      if (!baseCtx) return;
      
      const imgData = baseCtx.getImageData(sx, sy, brushSize, brushSize);
      drawCtx.putImageData(imgData, x, y);
    } else if (activeTool === 'marquee') {
      // Draw Selection Rect on UI Layer
      uiCtx.clearRect(0, 0, uiCanvasRef.current!.width, uiCanvasRef.current!.height);
      uiCtx.strokeStyle = '#00ffff';
      uiCtx.setLineDash([5, 3]);
      const w = x - startPos.current.x;
      const h = y - startPos.current.y;
      uiCtx.strokeRect(startPos.current.x, startPos.current.y, w, h);
      setSelection({ x: startPos.current.x, y: startPos.current.y, w, h });
    }
  };

  const handleMouseUp = () => {
    if (isDrawing.current && (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'stamp')) {
      saveHistory();
    }
    isDrawing.current = false;
  };

  const handleExport = (format: string) => {
    const baseCanvas = baseCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    if (!baseCanvas || !drawCanvas) return;

    const mergeCanvas = document.createElement('canvas');
    mergeCanvas.width = baseCanvas.width;
    mergeCanvas.height = baseCanvas.height;
    const ctx = mergeCanvas.getContext('2d')!;
    ctx.drawImage(baseCanvas, 0, 0);
    ctx.drawImage(drawCanvas, 0, 0);

    const link = document.createElement('a');
    link.download = `${fileName}.${format}`;
    link.href = mergeCanvas.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png');
    link.click();
  };

  const imageTransform = `scale(${zoom / 100})`;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Top Bar */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex justify-between items-center no-print z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-700 rounded-md text-slate-300"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex items-center gap-2 text-purple-400"><Layers className="w-5 h-5" /><h1 className="font-bold text-slate-100">Photo Studio Pro</h1></div>
        </div>
        <div className="flex gap-2 items-center">
          <input type="file" accept="image/*" onChange={e => e.target.files && loadFile(e.target.files[0])} className="hidden" id="img-upload" />
          <label htmlFor="img-upload" className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-300 cursor-pointer"><Upload className="w-5 h-5" /></label>
          <button onClick={applyUnsharpMask} className="px-3 py-2 bg-slate-700 text-slate-300 rounded-md text-xs font-semibold hover:bg-slate-600 flex items-center gap-2"><SunDim className="w-4 h-4" /> Sharpen</button>
          <select onChange={e => handleExport(e.target.value)} className="px-2 py-1 bg-slate-700 text-slate-200 rounded-md text-xs border-none outline-none">
            <option value="png">Export PNG</option>
            <option value="jpg">Export JPG</option>
          </select>
          <button onClick={() => handleExport('png')} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-500 flex items-center gap-2"><Download className="w-4 h-4" /> Save</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Toolbar */}
        <div className="w-12 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-2 gap-2 no-print">
          <ToolBtn icon={<MousePointer2 className="w-5 h-5" />} active={activeTool === 'move'} onClick={() => setActiveTool('move')} />
          <ToolBtn icon={<Crop className="w-5 h-5" />} active={activeTool === 'marquee'} onClick={() => setActiveTool('marquee')} />
          <ToolBtn icon={<Lasso className="w-5 h-5" />} active={activeTool === 'lasso'} onClick={() => setActiveTool('lasso')} />
          <div className="w-8 border-t border-slate-700 my-1"></div>
          <ToolBtn icon={<Brush className="w-5 h-5" />} active={activeTool === 'brush'} onClick={() => setActiveTool('brush')} />
          <ToolBtn icon={<Eraser className="w-5 h-5" />} active={activeTool === 'eraser'} onClick={() => setActiveTool('eraser')} />
          <ToolBtn icon={<Stamp className="w-5 h-5" />} active={activeTool === 'stamp'} onClick={() => setActiveTool('stamp')} />
          <div className="w-8 border-t border-slate-700 my-1"></div>
          <button onClick={undo} className="p-2 text-slate-400 hover:text-white"><Unlink className="w-5 h-5" /></button>
        </div>

        {/* Center Canvas (Layered) */}
        <main className="flex-1 bg-slate-950 flex items-center justify-center overflow-auto relative">
          {imageUrl && (
            <div className="relative" style={{ width: '80%', height: '80%' }}>
              <canvas ref={baseCanvasRef} className="absolute inset-0 w-full h-full object-contain shadow-2xl" style={{ transform: imageTransform }}></canvas>
              <canvas ref={drawCanvasRef} className="absolute inset-0 w-full h-full object-contain" style={{ transform: imageTransform }}></canvas>
              <canvas 
                ref={uiCanvasRef} 
                onMouseDown={handleMouseDown} 
                onMouseMove={handleMouseMove} 
                onMouseUp={handleMouseUp} 
                onMouseLeave={handleMouseUp}
                className={`absolute inset-0 w-full h-full object-contain ${activeTool !== 'move' ? 'cursor-crosshair' : 'cursor-default'}`}
                style={{ transform: imageTransform }}
              />
            </div>
          )}
        </main>

        {/* Right Panel (Layers & Adjustments) */}
        <aside className="w-64 bg-slate-800 border-l border-slate-700 flex flex-col no-print">
          <div className="p-3 border-b border-slate-700">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tool Options</h3>
            {activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'stamp' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Size:</span>
                  <input type="range" min="1" max="100" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="w-full accent-purple-500" />
                  <span className="text-xs text-slate-300 w-6">{brushSize}</span>
                </div>
                {activeTool === 'stamp' && <p className="text-xs text-amber-400">Alt+Click to set source point</p>}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Select a drawing or selection tool.</p>
            )}
          </div>

          <div className="p-3 border-b border-slate-700">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Adjustments</h3>
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => { /* Logic to flip base canvas */ }} className="p-2 bg-slate-700 rounded-md text-slate-300 hover:bg-slate-600 justify-center flex"><FlipHorizontal className="w-4 h-4" /></button>
              <button className="p-2 bg-slate-700 rounded-md text-slate-300 hover:bg-slate-600 justify-center flex"><FlipVertical className="w-4 h-4" /></button>
              <button className="p-2 bg-slate-700 rounded-md text-slate-300 hover:bg-slate-600 justify-center flex"><RotateCw className="w-4 h-4" /></button>
              <button className="p-2 bg-slate-700 rounded-md text-slate-300 hover:bg-slate-600 justify-center flex"><RotateCcw className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex-1 p-3 overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Layers</h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between p-2 bg-purple-900/30 border border-purple-700 rounded-md text-purple-300">
                <span>Draw Layer</span>
                <button onClick={() => { drawCanvasRef.current?.getContext('2d')?.clearRect(0,0,800,600); saveHistory(); }} className="text-red-400 hover:text-red-300">Clear</button>
              </div>
              <div className="p-2 bg-slate-700/50 border border-slate-600 rounded-md text-slate-400">Base Image</div>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Status Bar */}
      <footer className="bg-slate-800 border-t border-slate-700 px-4 py-1 flex justify-between items-center text-xs text-slate-500 no-print">
        <div className="flex gap-4">
          <span>Zoom: {zoom}%</span>
          {selection.w !== 0 && <span>Selection: {Math.abs(selection.w)}x{Math.abs(selection.h)}</span>}
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => setZoom(Math.max(10, zoom - 10))} className="p-1 hover:bg-slate-700 rounded-sm"><ZoomOut className="w-3 h-3" /></button>
          <input type="range" min="10" max="200" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-32 accent-purple-500" />
          <button onClick={() => setZoom(Math.min(400, zoom + 10))} className="p-1 hover:bg-slate-700 rounded-sm"><ZoomIn className="w-3 h-3" /></button>
        </div>
      </footer>
    </div>
  );
}

const ToolBtn = ({ icon, active, onClick }: { icon: React.ReactNode; active: boolean; onClick: () => void }) => (
  <button onClick={onClick} className={`p-2 rounded-md transition-colors ${active ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}>{icon}</button>
);
