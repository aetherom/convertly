import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Download, ArrowLeft, Upload, Layers, Crop, 
  MousePointer2, Lasso, Brush, Eraser, Stamp, ZoomIn, ZoomOut, 
  Unlink, FlipHorizontal, FlipVertical, RotateCw, RotateCcw, SunDim, 
  Palette, PaintBucket, Wand2, Eye, Merge, Image as ImageIcon, Droplet
} from 'lucide-react';

export default function ImageEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState('');
  const [fileName, setFileName] = useState('untitled');
  
  const [activeTool, setActiveTool] = useState('move');
  const [brushSize, setBrushSize] = useState(10);
  const [brushColor, setBrushColor] = useState('#ff0000');
  const [zoom, setZoom] = useState(100);
  
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const uiCanvasRef = useRef<HTMLCanvasElement>(null);
  
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
      const w = Math.min(1000, img.width);
      const h = Math.min(800, img.height);
      [baseCanvas, drawCanvas, uiCanvas].forEach(c => { c.width = w; c.height = h; });
      const ctx = baseCanvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
    };
  };

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = uiCanvasRef.current; if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: Math.floor((e.nativeEvent.clientX - rect.left) * (canvas.width / rect.width)), y: Math.floor((e.nativeEvent.clientY - rect.top) * (canvas.height / rect.height)) };
  };

  // --- REAL ALGORITHMS ---

  // 1. Flood Fill (Bucket Tool)
  const floodFill = (x: number, y: number, fillColor: string) => {
    const canvas = drawCanvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const targetIdx = (y * canvas.width + x) * 4;
    const tR = data[targetIdx], tG = data[targetIdx+1], tB = data[targetIdx+2], tA = data[targetIdx+3];
    
    const hex = fillColor.replace('#', '');
    const fR = parseInt(hex.substring(0, 2), 16), fG = parseInt(hex.substring(2, 4), 16), fB = parseInt(hex.substring(4, 6), 16);
    
    const match = (idx: number) => Math.abs(data[idx]-tR)<40 && Math.abs(data[idx+1]-tG)<40 && Math.abs(data[idx+2]-tB)<40 && Math.abs(data[idx+3]-tA)<40;
    
    const stack = [[x, y]];
    while (stack.length) {
      const [px, py] = stack.pop()!;
      if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) continue;
      const idx = (py * canvas.width + px) * 4;
      if (match(idx)) {
        data[idx] = fR; data[idx+1] = fG; data[idx+2] = fB; data[idx+3] = 255;
        stack.push([px+1, py], [px-1, py], [px, py+1], [px, py-1]);
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };

  // 2. Magic Wand (Color Selection)
  const magicWand = (x: number, y: number) => {
    const baseCanvas = baseCanvasRef.current; if (!baseCanvas) return;
    const uiCtx = uiCanvasRef.current?.getContext('2d')!;
    const ctx = baseCanvas.getContext('2d', { willReadFrequently: true })!;
    const imgData = ctx.getImageData(0, 0, baseCanvas.width, baseCanvas.height);
    const data = imgData.data;
    const targetIdx = (y * baseCanvas.width + x) * 4;
    const tR = data[targetIdx], tG = data[targetIdx+1], tB = data[targetIdx+2];
    
    uiCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
    uiCtx.fillStyle = 'rgba(0, 255, 255, 0.3)';
    
    const stack = [[x, y]];
    const visited = new Set();
    while (stack.length) {
      const [px, py] = stack.pop()!;
      const key = `${px},${py}`;
      if (visited.has(key) || px < 0 || py < 0 || px >= baseCanvas.width || py >= baseCanvas.height) continue;
      visited.add(key);
      const idx = (py * baseCanvas.width + px) * 4;
      if (Math.abs(data[idx]-tR)<30 && Math.abs(data[idx+1]-tG)<30 && Math.abs(data[idx+2]-tB)<30) {
        uiCtx.fillRect(px, py, 1, 1);
        stack.push([px+1, py], [px-1, py], [px, py+1], [px, py-1]);
      }
    }
  };

  // 3. Remove Background (Chroma Key based on clicked color)
  const removeBg = (x: number, y: number) => {
    const baseCanvas = baseCanvasRef.current; if (!baseCanvas) return;
    const ctx = baseCanvas.getContext('2d', { willReadFrequently: true })!;
    const imgData = ctx.getImageData(0, 0, baseCanvas.width, baseCanvas.height);
    const data = imgData.data;
    const targetIdx = (y * baseCanvas.width + x) * 4;
    const tR = data[targetIdx], tG = data[targetIdx+1], tB = data[targetIdx+2];
    
    for (let i = 0; i < data.length; i += 4) {
      if (Math.abs(data[i]-tR)<50 && Math.abs(data[i+1]-tG)<50 && Math.abs(data[i+2]-tB)<50) {
        data[i+3] = 0; // Set transparent
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };

  // 4. Red Eye Remover
  const removeRedEye = (x: number, y: number, radius: number) => {
    const baseCanvas = baseCanvasRef.current; if (!baseCanvas) return;
    const ctx = baseCanvas.getContext('2d', { willReadFrequently: true })!;
    const imgData = ctx.getImageData(Math.max(0, x-radius), Math.max(0, y-radius), radius*2, radius*2);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 100 && data[i] > data[i+1] * 1.5 && data[i] > data[i+2] * 1.5) {
        data[i] = (data[i+1] + data[i+2]) / 2; // Desaturate red
      }
    }
    ctx.putImageData(imgData, Math.max(0, x-radius), Math.max(0, y-radius));
  };

  // 5. Crop (Real Canvas Resize)
  const applyCrop = () => {
    if (selection.w === 0) return;
    const baseCanvas = baseCanvasRef.current; if (!baseCanvas) return;
    const drawCanvas = drawCanvasRef.current; if (!drawCanvas) return;
    
    const cropW = Math.abs(selection.w);
    const cropH = Math.abs(selection.h);
    const cropX = selection.w > 0 ? selection.x : selection.x + selection.w;
    const cropY = selection.h > 0 ? selection.y : selection.y + selection.h;

    const tempBase = document.createElement('canvas');
    tempBase.width = cropW; tempBase.height = cropH;
    tempBase.getContext('2d')!.drawImage(baseCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    
    const tempDraw = document.createElement('canvas');
    tempDraw.width = cropW; tempDraw.height = cropH;
    tempDraw.getContext('2d')!.drawImage(drawCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    baseCanvas.width = cropW; baseCanvas.height = cropH;
    baseCanvas.getContext('2d')!.drawImage(tempBase, 0, 0);
    drawCanvas.width = cropW; drawCanvas.height = cropH;
    drawCanvas.getContext('2d')!.drawImage(tempDraw, 0, 0);
    
    setSelection({ x: 0, y: 0, w: 0, h: 0 });
    uiCanvasRef.current?.getContext('2d')?.clearRect(0, 0, cropW, cropH);
  };

  // 6. Merge Overlay Image
  const [overlayImg, setOverlayImg] = useState<HTMLImageElement | null>(null);
  const mergeImage = (file: File) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const ctx = drawCanvasRef.current?.getContext('2d')!;
      ctx.drawImage(img, 0, 0, img.width / 2, img.height / 2);
    };
  };

  // --- Mouse Handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getMousePos(e);
    startPos.current = { x, y };
    isDrawing.current = true;

    if (activeTool === 'bucket') { floodFill(x, y, brushColor); isDrawing.current = false; return; }
    if (activeTool === 'wand') { magicWand(x, y); isDrawing.current = false; return; }
    if (activeTool === 'removebg') { removeBg(x, y); isDrawing.current = false; return; }
    if (activeTool === 'redeye') { removeRedEye(x, y, brushSize); isDrawing.current = false; return; }
    if (activeTool === 'crop') { setSelection({ x, y, w: 0, h: 0 }); return; }
    if (activeTool === 'stamp' && e.altKey) { cloneSource.current = { x, y }; isDrawing.current = false; return; }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing.current) return;
    const { x, y } = getMousePos(e);
    const drawCtx = drawCanvasRef.current?.getContext('2d')!;
    const uiCtx = uiCanvasRef.current?.getContext('2d')!;

    if (activeTool === 'brush' || activeTool === 'eraser') {
      drawCtx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
      drawCtx.lineWidth = brushSize;
      drawCtx.lineCap = 'round';
      drawCtx.strokeStyle = brushColor;
      drawCtx.beginPath();
      drawCtx.moveTo(startPos.current.x, startPos.current.y);
      drawCtx.lineTo(x, y);
      drawCtx.stroke();
      startPos.current = { x, y };
    } else if (activeTool === 'crop') {
      uiCtx.clearRect(0, 0, uiCanvasRef.current!.width, uiCanvasRef.current!.height);
      uiCtx.strokeStyle = '#fff';
      uiCtx.setLineDash([5, 3]);
      uiCtx.strokeRect(startPos.current.x, startPos.current.y, x - startPos.current.x, y - startPos.current.y);
      uiCtx.strokeStyle = '#000';
      setSelection({ x: startPos.current.x, y: startPos.current.y, w: x - startPos.current.x, h: y - startPos.current.y });
    }
  };

  const handleMouseUp = () => { isDrawing.current = false; };

  const handleExport = (format: string) => {
    const baseCanvas = baseCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    if (!baseCanvas || !drawCanvas) return;
    const mergeCanvas = document.createElement('canvas');
    mergeCanvas.width = baseCanvas.width; mergeCanvas.height = baseCanvas.height;
    const ctx = mergeCanvas.getContext('2d')!;
    ctx.drawImage(baseCanvas, 0, 0);
    ctx.drawImage(drawCanvas, 0, 0);
    const link = document.createElement('a');
    link.download = `${fileName}.${format}`;
    link.href = mergeCanvas.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png');
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex justify-between items-center no-print z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-700 rounded-md text-slate-300"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex items-center gap-2 text-purple-400"><Layers className="w-5 h-5" /><h1 className="font-bold text-slate-100">Photo Studio Max</h1></div>
        </div>
        <div className="flex gap-2 items-center">
          <input type="file" accept="image/*" onChange={e => e.target.files && loadFile(e.target.files[0])} className="hidden" id="img-upload" />
          <label htmlFor="img-upload" className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-300 cursor-pointer"><Upload className="w-5 h-5" /></label>
          {activeTool === 'crop' && selection.w !== 0 && (
            <button onClick={applyCrop} className="px-3 py-2 bg-green-600 text-white rounded-md text-xs font-semibold hover:bg-green-500">Apply Crop</button>
          )}
          <select onChange={e => handleExport(e.target.value)} className="px-2 py-1 bg-slate-700 text-slate-200 rounded-md text-xs border-none outline-none">
            <option value="png">Export PNG</option>
            <option value="jpg">Export JPG</option>
          </select>
          <button onClick={() => handleExport('png')} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-500 flex items-center gap-2"><Download className="w-4 h-4" /> Save</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-12 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-2 gap-2 no-print">
          <ToolBtn icon={<MousePointer2 className="w-5 h-5" />} active={activeTool === 'move'} onClick={() => setActiveTool('move')} />
          <ToolBtn icon={<Crop className="w-5 h-5" />} active={activeTool === 'crop'} onClick={() => setActiveTool('crop')} />
          <ToolBtn icon={<PaintBucket className="w-5 h-5" />} active={activeTool === 'bucket'} onClick={() => setActiveTool('bucket')} />
          <ToolBtn icon={<Wand2 className="w-5 h-5" />} active={activeTool === 'wand'} onClick={() => setActiveTool('wand')} />
          <ToolBtn icon={<Droplet className="w-5 h-5" />} active={activeTool === 'removebg'} onClick={() => setActiveTool('removebg')} />
          <ToolBtn icon={<Eye className="w-5 h-5" />} active={activeTool === 'redeye'} onClick={() => setActiveTool('redeye')} />
          <div className="w-8 border-t border-slate-700 my-1"></div>
          <ToolBtn icon={<Brush className="w-5 h-5" />} active={activeTool === 'brush'} onClick={() => setActiveTool('brush')} />
          <ToolBtn icon={<Eraser className="w-5 h-5" />} active={activeTool === 'eraser'} onClick={() => setActiveTool('eraser')} />
          <ToolBtn icon={<Stamp className="w-5 h-5" />} active={activeTool === 'stamp'} onClick={() => setActiveTool('stamp')} />
          <div className="w-8 border-t border-slate-700 my-1"></div>
          <label htmlFor="merge-img" className="p-2 text-slate-400 hover:text-white cursor-pointer"><Merge className="w-5 h-5" /></label>
          <input type="file" accept="image/*" onChange={e => e.target.files && mergeImage(e.target.files[0])} className="hidden" id="merge-img" />
        </div>

        <main className="flex-1 bg-slate-950 flex items-center justify-center overflow-auto relative">
          {imageUrl && (
            <div className="relative" style={{ width: '80%', height: '80%' }}>
              <canvas ref={baseCanvasRef} className="absolute inset-0 w-full h-full object-contain shadow-2xl" style={{ transform: `scale(${zoom / 100})` }}></canvas>
              <canvas ref={drawCanvasRef} className="absolute inset-0 w-full h-full object-contain" style={{ transform: `scale(${zoom / 100})` }}></canvas>
              <canvas ref={uiCanvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} className={`absolute inset-0 w-full h-full object-contain ${activeTool !== 'move' ? 'cursor-crosshair' : 'cursor-default'}`} style={{ transform: `scale(${zoom / 100})` }} />
            </div>
          )}
        </main>

        <aside className="w-64 bg-slate-800 border-l border-slate-700 flex flex-col no-print">
          <div className="p-3 border-b border-slate-700">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tool Options</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Color:</span>
                <input type="color" value={brushColor} onChange={e => setBrushColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
              </div>
              {(activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'stamp' || activeTool === 'redeye') && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Size:</span>
                  <input type="range" min="1" max="100" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="w-full accent-purple-500" />
                  <span className="text-xs text-slate-300 w-6">{brushSize}</span>
                </div>
              )}
              {activeTool === 'stamp' && <p className="text-xs text-amber-400">Alt+Click to set source point</p>}
              {activeTool === 'removebg' && <p className="text-xs text-cyan-400">Click on the background color to remove it.</p>}
              {activeTool === 'wand' && <p className="text-xs text-cyan-400">Click an area to select similar colors.</p>}
            </div>
          </div>
          <div className="flex-1 p-3 overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Layers</h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between p-2 bg-purple-900/30 border border-purple-700 rounded-md text-purple-300">
                <span>Draw Layer (Overlay)</span>
                <button onClick={() => { drawCanvasRef.current?.getContext('2d')?.clearRect(0,0,1000,800); }} className="text-red-400 hover:text-red-300">Clear</button>
              </div>
              <div className="p-2 bg-slate-700/50 border border-slate-600 rounded-md text-slate-400">Base Image (Raster)</div>
            </div>
          </div>
        </aside>
      </div>

      <footer className="bg-slate-800 border-t border-slate-700 px-4 py-1 flex justify-between items-center text-xs text-slate-500 no-print">
        <div className="flex gap-4">
          <span>Zoom: {zoom}%</span>
          {selection.w !== 0 && <span>Selection: {Math.abs(selection.w)}x{Math.abs(selection.h)}</span>}
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => setZoom(Math.max(10, zoom - 10))} className="p-1 hover:bg-slate-700 rounded-sm"><ZoomOut className="w-3 h-3" /></button>
          <input type="range" min="10" max="400" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-32 accent-purple-500" />
          <button onClick={() => setZoom(Math.min(400, zoom + 10))} className="p-1 hover:bg-slate-700 rounded-sm"><ZoomIn className="w-3 h-3" /></button>
        </div>
      </footer>
    </div>
  );
}

const ToolBtn = ({ icon, active, onClick }: { icon: React.ReactNode; active: boolean; onClick: () => void }) => (
  <button onClick={onClick} className={`p-2 rounded-md transition-colors ${active ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}>{icon}</button>
);
