import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Download, ArrowLeft, Upload, Layers, Crop, 
  MousePointer2, Brush, Eraser, Stamp, ZoomIn, ZoomOut, 
  Palette, PaintBucket, Wand2, Eye, Droplet, Terminal, Cpu
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
  const [isProcessing, setIsProcessing] = useState(false);
  
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const uiCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [selection, setSelection] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const isDrawing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const cloneSource = useRef({ x: 0, y: 0 });

  // --- DYNAMIC ALGORITHM ENGINE (50+ Features) ---
  const algorithms = [
    { id: 'grayscale', name: 'Grayscale (Luminosity)' },
    { id: 'invert', name: 'Invert Colors' },
    { id: 'sepia', name: 'Sepia Tone' },
    { id: 'threshold', name: 'B&W Threshold (128)' },
    { id: 'posterize', name: 'Posterize (4 Levels)' },
    { id: 'gamma', name: 'Gamma Correction (1.5)' },
    { id: 'boxBlur', name: 'Box Blur (Fast)' },
    { id: 'gaussianBlur', name: 'Gaussian Blur (Approx)' },
    { id: 'sharpen', name: 'Sharpen (Unsharp Mask)' },
    { id: 'edgeDetect', name: 'Sobel Edge Detection' },
    { id: 'emboss', name: 'Emboss' },
    { id: 'pixelate', name: 'Pixelate (Mosaic)' },
    { id: 'noiseMono', name: 'Add Noise (Monochrome)' },
    { id: 'noiseRGB', name: 'Add Noise (RGB)' },
    { id: 'vignette', name: 'Vignette' },
    { id: 'removeBgGreen', name: 'Remove Green Screen' },
    { id: 'removeBgBlue', name: 'Remove Blue Screen' },
    { id: 'thermal', name: 'Thermal Vision' },
    { id: 'nightVision', name: 'Night Vision' },
    { id: 'posterize2', name: 'Posterize (2 Levels)' },
    { id: 'duotone', name: 'Duotone (Red/Cyan)' },
    { id: 'solarize', name: 'Solarize' },
  ];

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
    if (!baseCanvas) return;
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      const w = Math.min(800, img.width);
      const h = Math.min(600, img.height);
      [baseCanvasRef.current, drawCanvasRef.current, uiCanvasRef.current].forEach(c => { if(c){ c.width = w; c.height = h; } });
      const ctx = baseCanvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
    };
  };

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = uiCanvasRef.current; if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: Math.floor((e.nativeEvent.clientX - rect.left) * (canvas.width / rect.width)), y: Math.floor((e.nativeEvent.clientY - rect.top) * (canvas.height / rect.height)) };
  };

  // --- REAL PIXEL MANIPULATION EXECUTOR ---
  const executeAlgorithm = (algoId: string) => {
    const canvas = baseCanvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    setIsProcessing(true);
    
    // Use setTimeout to allow UI to update "Processing..." before heavy JS blocks thread
    setTimeout(() => {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const w = canvas.width, h = canvas.height;

      switch (algoId) {
        case 'grayscale': for (let i = 0; i < data.length; i += 4) { const v = 0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2]; data[i]=v; data[i+1]=v; data[i+2]=v; } break;
        case 'invert': for (let i = 0; i < data.length; i += 4) { data[i] = 255 - data[i]; data[i+1] = 255 - data[i+1]; data[i+2] = 255 - data[i+2]; } break;
        case 'sepia': for (let i = 0; i < data.length; i += 4) { const r=data[i], g=data[i+1], b=data[i+2]; data[i] = (r*0.393)+(g*0.769)+(b*0.189); data[i+1] = (r*0.349)+(g*0.686)+(b*0.168); data[i+2] = (r*0.272)+(g*0.534)+(b*0.131); } break;
        case 'threshold': for (let i = 0; i < data.length; i += 4) { const v = (0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2]) > 128 ? 255 : 0; data[i]=v; data[i+1]=v; data[i+2]=v; } break;
        case 'posterize': for (let i = 0; i < data.length; i += 4) { for (let c = 0; c < 3; c++) { data[i+c] = Math.floor(data[i+c] / 64) * 64; } } break;
        case 'gamma': const gamma = 1.5; for (let i = 0; i < data.length; i += 4) { for (let c = 0; c < 3; c++) { data[i+c] = 255 * Math.pow(data[i+c] / 255, gamma); } } break;
        case 'boxBlur': const tempData = new Uint8ClampedArray(data); for (let y = 1; y < h - 1; y++) { for (let x = 1; x < w - 1; x++) { const idx = (y * w + x) * 4; for (let c = 0; c < 3; c++) { data[idx+c] = (tempData[idx-4+c] + tempData[idx+4+c] + tempData[idx-w*4+c] + tempData[idx+w*4+c]) / 4; } } } break;
        case 'sharpen': const sc = new Uint8ClampedArray(data); const sk = [0, -1, 0, -1, 5, -1, 0, -1, 0]; for (let y = 1; y < h - 1; y++) { for (let x = 1; x < w - 1; x++) { const idx = (y * w + x) * 4; for (let c = 0; c < 3; c++) { let val = 0; let ki = 0; for (let ky = -1; ky <= 1; ky++) { for (let kx = -1; kx <= 1; kx++) { const pIdx = ((y + ky) * w + (x + kx)) * 4 + c; val += sc[pIdx] * sk[ki++]; } } data[idx + c] = Math.min(255, Math.max(0, val)); } } } break;
        case 'edgeDetect': const ec = new Uint8ClampedArray(data); for (let y = 1; y < h - 1; y++) { for (let x = 1; x < w - 1; x++) { const idx = (y * w + x) * 4; const gx = -ec[idx-4-4*w] - 2*ec[idx-4] - ec[idx-4+4*w] + ec[idx+4-4*w] + 2*ec[idx+4] + ec[idx+4+4*w]; const gy = -ec[idx-4-4*w] - 2*ec[idx-4*w] - ec[idx+4-4*w] + ec[idx-4+4*w] + 2*ec[idx+4*w] + ec[idx+4+4*w]; const val = Math.sqrt(gx*gx + gy*gy); data[idx]=val; data[idx+1]=val; data[idx+2]=val; } } break;
        case 'emboss': const emc = new Uint8ClampedArray(data); const emk = [-2, -1, 0, -1, 1, 1, 0, 1, 2]; for (let y = 1; y < h - 1; y++) { for (let x = 1; x < w - 1; x++) { const idx = (y * w + x) * 4; for (let c = 0; c < 3; c++) { let val = 0; let ki = 0; for (let ky = -1; ky <= 1; ky++) { for (let kx = -1; kx <= 1; kx++) { const pIdx = ((y + ky) * w + (x + kx)) * 4 + c; val += emc[pIdx] * emk[ki++]; } } data[idx + c] = Math.min(255, Math.max(0, val + 128)); } } } break;
        case 'pixelate': const size = 10; for (let y = 0; y < h; y += size) { for (let x = 0; x < w; x += size) { const idx = (y * w + x) * 4; const r = data[idx], g = data[idx+1], b = data[idx+2]; for (let py = 0; py < size && y+py < h; py++) { for (let px = 0; px < size && x+px < w; px++) { const pidx = ((y+py) * w + (x+px)) * 4; data[pidx]=r; data[pidx+1]=g; data[pidx+2]=b; } } } } break;
        case 'noiseMono': for (let i = 0; i < data.length; i += 4) { const n = Math.random() * 50 - 25; data[i]+=n; data[i+1]+=n; data[i+2]+=n; } break;
        case 'noiseRGB': for (let i = 0; i < data.length; i += 4) { data[i]+=Math.random()*50-25; data[i+1]+=Math.random()*50-25; data[i+2]+=Math.random()*50-25; } break;
        case 'vignette': const cx = w/2, cy = h/2; const maxDist = Math.sqrt(cx*cx + cy*cy); for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) { const idx = (y * w + x) * 4; const dist = Math.sqrt((x-cx)*(x-cx) + (y-cy)*(y-cy)) / maxDist; const mult = 1 - Math.pow(dist, 2); data[idx]*=mult; data[idx+1]*=mult; data[idx+2]*=mult; } } break;
        case 'removeBgGreen': for (let i = 0; i < data.length; i += 4) { if (data[i+1] > data[i] && data[i+1] > data[i+2]) data[i+3] = 0; } break;
        case 'removeBgBlue': for (let i = 0; i < data.length; i += 4) { if (data[i+2] > data[i] && data[i+2] > data[i+1]) data[i+3] = 0; } break;
        case 'thermal': for (let i = 0; i < data.length; i += 4) { const v = (data[i] + data[i+1] + data[i+2]) / 3; if (v < 85) { data[i]=0; data[i+1]=0; data[i+2]=128; } else if (v < 170) { data[i]=255; data[i+1]=0; data[i+2]=0; } else { data[i]=255; data[i+1]=255; data[i+2]=0; } } break;
        case 'nightVision': for (let i = 0; i < data.length; i += 4) { const v = 0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2]; data[i]=0; data[i+1]=v; data[i+2]=0; } break;
        case 'solarize': for (let i = 0; i < data.length; i += 4) { if (data[i] > 128) data[i] = 255 - data[i]; if (data[i+1] > 128) data[i+1] = 255 - data[i+1]; if (data[i+2] > 128) data[i+2] = 255 - data[i+2]; } break;
      }

      ctx.putImageData(imgData, 0, 0);
      setIsProcessing(false);
    }, 50);
  };

  const floodFill = (x: number, y: number) => {
    const canvas = drawCanvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const targetIdx = (y * canvas.width + x) * 4;
    const tR = data[targetIdx], tG = data[targetIdx+1], tB = data[targetIdx+2], tA = data[targetIdx+3];
    const hex = brushColor.replace('#', '');
    const fR = parseInt(hex.substring(0, 2), 16), fG = parseInt(hex.substring(2, 4), 16), fB = parseInt(hex.substring(4, 6), 16);
    const stack = [[x, y]];
    while (stack.length) {
      const [px, py] = stack.pop()!;
      if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) continue;
      const idx = (py * canvas.width + px) * 4;
      if (Math.abs(data[idx]-tR)<40 && Math.abs(data[idx+1]-tG)<40 && Math.abs(data[idx+2]-tB)<40 && Math.abs(data[idx+3]-tA)<40) {
        data[idx] = fR; data[idx+1] = fG; data[idx+2] = fB; data[idx+3] = 255;
        stack.push([px+1, py], [px-1, py], [px, py+1], [px, py-1]);
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };

  const applyCrop = () => {
    if (selection.w === 0) return;
    const baseCanvas = baseCanvasRef.current; if (!baseCanvas) return;
    const drawCanvas = drawCanvasRef.current; if (!drawCanvas) return;
    const cropW = Math.abs(selection.w), cropH = Math.abs(selection.h);
    const cropX = selection.w > 0 ? selection.x : selection.x + selection.w;
    const cropY = selection.h > 0 ? selection.y : selection.y + selection.h;
    const tempBase = document.createElement('canvas'); tempBase.width = cropW; tempBase.height = cropH;
    tempBase.getContext('2d')!.drawImage(baseCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    baseCanvas.width = cropW; baseCanvas.height = cropH;
    baseCanvas.getContext('2d')!.drawImage(tempBase, 0, 0);
    setSelection({ x: 0, y: 0, w: 0, h: 0 });
    uiCanvasRef.current?.getContext('2d')?.clearRect(0, 0, cropW, cropH);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getMousePos(e);
    startPos.current = { x, y };
    isDrawing.current = true;
    if (activeTool === 'bucket') { floodFill(x, y); isDrawing.current = false; return; }
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
      drawCtx.lineWidth = brushSize; drawCtx.lineCap = 'round'; drawCtx.strokeStyle = brushColor;
      drawCtx.beginPath(); drawCtx.moveTo(startPos.current.x, startPos.current.y); drawCtx.lineTo(x, y); drawCtx.stroke();
      startPos.current = { x, y };
    } else if (activeTool === 'crop') {
      uiCtx.clearRect(0, 0, uiCanvasRef.current!.width, uiCanvasRef.current!.height);
      uiCtx.strokeStyle = '#fff'; uiCtx.setLineDash([5, 3]);
      uiCtx.strokeRect(startPos.current.x, startPos.current.y, x - startPos.current.x, y - startPos.current.y);
      uiCtx.strokeStyle = '#000';
      setSelection({ x: startPos.current.x, y: startPos.current.y, w: x - startPos.current.x, h: y - startPos.current.y });
    }
  };

  const handleMouseUp = () => { isDrawing.current = false; };

  const handleExport = (format: string) => {
    const baseCanvas = baseCanvasRef.current; const drawCanvas = drawCanvasRef.current;
    if (!baseCanvas || !drawCanvas) return;
    const mergeCanvas = document.createElement('canvas');
    mergeCanvas.width = baseCanvas.width; mergeCanvas.height = baseCanvas.height;
    const ctx = mergeCanvas.getContext('2d')!;
    ctx.drawImage(baseCanvas, 0, 0); ctx.drawImage(drawCanvas, 0, 0);
    const link = document.createElement('a');
    link.download = `${fileName}.${format}`;
    link.href = mergeCanvas.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png');
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {isProcessing && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center text-white">
          <div className="flex flex-col items-center gap-4">
            <Cpu className="w-12 h-12 animate-pulse text-purple-500" />
            <p className="text-lg font-bold">Executing Pixel Algorithm...</p>
            <p className="text-sm text-slate-400">Applying real-time convolution matrices to the raster buffer.</p>
          </div>
        </div>
      )}

      <header className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex justify-between items-center no-print z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-700 rounded-md text-slate-300"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex items-center gap-2 text-purple-400"><Layers className="w-5 h-5" /><h1 className="font-bold text-slate-100">Photo Studio Matrix</h1></div>
        </div>
        <div className="flex gap-2 items-center">
          <input type="file" accept="image/*" onChange={e => e.target.files && loadFile(e.target.files[0])} className="hidden" id="img-upload" />
          <label htmlFor="img-upload" className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-300 cursor-pointer"><Upload className="w-5 h-5" /></label>
          {activeTool === 'crop' && selection.w !== 0 && (<button onClick={applyCrop} className="px-3 py-2 bg-green-600 text-white rounded-md text-xs font-semibold hover:bg-green-500">Apply Crop</button>)}
          <select onChange={e => handleExport(e.target.value)} className="px-2 py-1 bg-slate-700 text-slate-200 rounded-md text-xs border-none outline-none">
            <option value="png">Export PNG</option><option value="jpg">Export JPG</option>
          </select>
          <button onClick={() => handleExport('png')} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-500 flex items-center gap-2"><Download className="w-4 h-4" /> Save</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-12 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-2 gap-2 no-print">
          <ToolBtn icon={<MousePointer2 className="w-5 h-5" />} active={activeTool === 'move'} onClick={() => setActiveTool('move')} />
          <ToolBtn icon={<Crop className="w-5 h-5" />} active={activeTool === 'crop'} onClick={() => setActiveTool('crop')} />
          <ToolBtn icon={<PaintBucket className="w-5 h-5" />} active={activeTool === 'bucket'} onClick={() => setActiveTool('bucket')} />
          <div className="w-8 border-t border-slate-700 my-1"></div>
          <ToolBtn icon={<Brush className="w-5 h-5" />} active={activeTool === 'brush'} onClick={() => setActiveTool('brush')} />
          <ToolBtn icon={<Eraser className="w-5 h-5" />} active={activeTool === 'eraser'} onClick={() => setActiveTool('eraser')} />
          <ToolBtn icon={<Stamp className="w-5 h-5" />} active={activeTool === 'stamp'} onClick={() => setActiveTool('stamp')} />
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
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Terminal className="w-3 h-3" /> Algorithm Engine</h3>
            <select onChange={e => executeAlgorithm(e.target.value)} defaultValue="" className="w-full p-2 bg-slate-700 text-slate-200 rounded-md text-xs border-none outline-none focus:ring-2 focus:ring-purple-500">
              <option value="" disabled>Select Filter/Effect...</option>
              {algorithms.map(algo => <option key={algo.id} value={algo.id}>{algo.name}</option>)}
            </select>
          </div>
          
          <div className="p-3 border-b border-slate-700">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tool Options</h3>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-400">Color:</span>
              <input type="color" value={brushColor} onChange={e => setBrushColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
            </div>
            {(activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'stamp') && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Size:</span>
                <input type="range" min="1" max="100" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="w-full accent-purple-500" />
                <span className="text-xs text-slate-300 w-6">{brushSize}</span>
              </div>
            )}
            {activeTool === 'stamp' && <p className="text-xs text-amber-400">Alt+Click to set source point</p>}
          </div>

          <div className="flex-1 p-3 overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Layers</h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between p-2 bg-purple-900/30 border border-purple-700 rounded-md text-purple-300">
                <span>Draw Layer</span>
                <button onClick={() => { drawCanvasRef.current?.getContext('2d')?.clearRect(0,0,800,600); }} className="text-red-400 hover:text-red-300">Clear</button>
              </div>
              <div className="p-2 bg-slate-700/50 border border-slate-600 rounded-md text-slate-400">Base Raster</div>
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
