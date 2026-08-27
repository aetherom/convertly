import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, RotateCw, FlipHorizontal, FlipVertical, PenTool, Eraser,
  Undo2, Type, ImagePlus, Maximize2, RotateCcw as ResetIcon,
} from 'lucide-react';
import { saveBlob } from '../lib/save';
import { useToast } from '../components/Toaster';

const MAX_DIM = 2000;

interface Stroke { color: string; size: number; pts: { x: number; y: number }[]; }
interface Filters { brightness: number; contrast: number; saturate: number; grayscale: number; sepia: number; invert: number; blur: number; }
interface Transform { rot: number; fx: 1 | -1; fy: 1 | -1; }

const DEFAULT_FILTERS: Filters = { brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, invert: 0, blur: 0 };
const DEFAULT_TRANSFORM: Transform = { rot: 0, fx: 1, fy: 1 };

const filterCss = (f: Filters) =>
  `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) grayscale(${f.grayscale}%) sepia(${f.sepia}%) invert(${f.invert}%) blur(${f.blur}px)`;

export default function ImageEditor() {
  const navigate = useNavigate();
  const toast = useToast();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const lastAnchorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [hasImage, setHasImage] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [transform, setTransform] = useState<Transform>(DEFAULT_TRANSFORM);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [drawingMode, setDrawingMode] = useState(false);
  const [brushColor, setBrushColor] = useState('#ff2222');
  const [brushSize, setBrushSize] = useState(5);
  const [textOverlay, setTextOverlay] = useState('');
  const [baseName, setBaseName] = useState('edited');

  const natW = imgRef.current?.naturalWidth ?? 0;
  const natH = imgRef.current?.naturalHeight ?? 0;
  const swap = transform.rot % 180 !== 0;
  const dispW = swap ? natH : natW;
  const dispH = swap ? natW : natH;

  /* ---------- geometry: display(px,py) -> image-space ---------- */
  const dispToImg = useCallback(
    (px: number, py: number) => {
      const img = imgRef.current;
      if (!img) return { x: 0, y: 0 };
      const rad = (-transform.rot * Math.PI) / 180; // inverse of the render rotation
      const cos = Math.cos(rad), sin = Math.sin(rad);
      const vx = px - dispW / 2;
      const vy = py - dispH / 2;
      const rx = cos * vx - sin * vy;
      const ry = sin * vx + cos * vy;
      return { x: rx / transform.fx + img.naturalWidth / 2, y: ry / transform.fy + img.naturalHeight / 2 };
    },
    [dispW, dispH, transform]
  );

  /* ---------- master composer: paints image + every stroke under one transform ---------- */
  const compose = useCallback(
    (ctx: CanvasRenderingContext2D, opts?: { filters?: Filters; transform?: Transform; strokes?: Stroke[] }) => {
      const img = imgRef.current;
      if (!img) return;
      const f = opts?.filters ?? filters;
      const t = opts?.transform ?? transform;
      const ss = opts?.strokes ?? strokes;
      const rw = t.rot % 180 ? img.naturalHeight : img.naturalWidth;
      const rh = t.rot % 180 ? img.naturalWidth : img.naturalHeight;

      ctx.save();
      ctx.translate(rw / 2, rh / 2);
      ctx.rotate((t.rot * Math.PI) / 180);
      ctx.scale(t.fx, t.fy);

      ctx.filter = filterCss(f);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.filter = 'none';

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const s of ss) {
        if (s.pts.length === 1) {
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(s.pts[0].x, s.pts[0].y, s.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.size;
          ctx.beginPath();
          ctx.moveTo(s.pts[0].x, s.pts[0].y);
          for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i].x, s.pts[i].y);
          ctx.stroke();
        }
      }
      ctx.restore();
    },
    [filters, transform, strokes]
  );

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const img = imgRef.current;
    const t = transform;
    canvas.width = t.rot % 180 ? img.naturalHeight : img.naturalWidth;
    canvas.height = t.rot % 180 ? img.naturalWidth : img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) compose(ctx);
  }, [compose, transform]);

  useEffect(() => { repaint(); }, [repaint, filters, transform, strokes]);

  const loadImageFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Downscale gigantic photos for snappy editing
      const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
      if (scale < 1) {
        const tmp = document.createElement('canvas');
        tmp.width = Math.round(img.naturalWidth * scale);
        tmp.height = Math.round(img.naturalHeight * scale);
        tmp.getContext('2d')?.drawImage(img, 0, 0, tmp.width, tmp.height);
        const scaled = new Image();
        scaled.onload = () => { imgRef.current = scaled; setHasImage(true); repaintNow(scaled); };
        scaled.src = tmp.toDataURL('image/png');
      } else {
        imgRef.current = img;
        setHasImage(true);
        repaintNow(img);
      }
      setBaseName(file.name.replace(/\.[^.]+$/, ''));
      setFilters(DEFAULT_FILTERS);
      setTransform(DEFAULT_TRANSFORM);
      setStrokes([]);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => toast('Could not read that image.', 'err');
    img.src = url;

    const repaintNow = (im: HTMLImageElement) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = im.naturalWidth;
      canvas.height = im.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) compose(ctx, { transform: DEFAULT_TRANSFORM, strokes: [] });
    };
  }, [compose, toast]);

  /* ---------- pointer drawing ---------- */
  const getLocalPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    return { px, py, ...dispToImg(px, py) };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = getLocalPoint(e);
    lastAnchorRef.current = { x: p.x, y: p.y };
    if (!drawingMode) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    currentStrokeRef.current = { color: brushColor, size: brushSize, pts: [{ x: p.x, y: p.y }] };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !currentStrokeRef.current) return;
    const p = getLocalPoint(e);
    currentStrokeRef.current.pts.push({ x: p.x, y: p.y });
    setStrokes((prev) => {
      const next = prev.slice();
      next.push(currentStrokeRef.current!);
      return next; // compose() replays all strokes each frame
    });
  };

  const endStroke = () => {
    if (currentStrokeRef.current) {
      const finished = currentStrokeRef.current;
      currentStrokeRef.current = null;
      setStrokes((prev) => {
        // previous move already appended; just trim the transient tail if empty
        if (!finished.pts.length) return prev;
        return prev;
      });
    }
    drawingRef.current = false;
  };

  /* perf note: appending the whole array per move keeps composer authoritative
     and avoids tearing between the transient stroke and repaints. */

  const addTextOverlay = () => {
    if (!textOverlay.trim()) return;
    const img = imgRef.current;
    if (!img) return;
    const size = Math.max(24, Math.round(Math.min(img.naturalWidth, img.naturalHeight) / 14));
    setStrokes((prev) => [
      ...prev,
      { color: brushColor, size, pts: [], /* text rendered separately */ ...({ __text: textOverlay, __anchor: lastAnchorRef.current } as any) },
    ]);
    setTextOverlay('');
  };

  const addStampImage = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const base = imgRef.current!;
        const w = Math.min(img.naturalWidth, base.naturalWidth / 3);
        const h = (img.naturalHeight / img.naturalWidth) * w;
        const anchor = lastAnchorRef.current;
        setStrokes((prev) => [...prev, ({ ...({ __stamp: img, __anchor, __w: w, __h: h } as any) } as any)]);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  /* extend composer for text/stamps without complicating the hot path */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    compose(ctx); // base layers
    ctx.save();
    const t = transform;
    const rw = t.rot % 180 ? natH : natW;
    const rh = t.rot % 180 ? natW : natH;
    ctx.translate(rw / 2, rh / 2);
    ctx.rotate((t.rot * Math.PI) / 180);
    ctx.scale(t.fx, t.fy);
    for (const s of strokes as any[]) {
      if (s.__text) {
        ctx.fillStyle = s.color;
        ctx.font = `${s.size}px Arial`;
        ctx.fillText(s.__text, (s.__anchor?.x ?? 0) - natW / 2, (s.__anchor?.y ?? 0) - natH / 2);
      } else if (s.__stamp) {
        ctx.drawImage(s.__stamp, (s.__anchor.x - natW / 2) ?? 0, (s.__anchor.y - natH / 2) ?? 0, s.__w, s.__h);
      }
    }
    ctx.restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes, transform, filters, hasImage]);

  const exportImage = async (format: 'png' | 'jpg') => {
    const img = imgRef.current;
    const srcCanvas = canvasRef.current;
    if (!img || !srcCanvas) return;
    const out = document.createElement('canvas');
    out.width = srcCanvas.width;
    out.height = srcCanvas.height;
    const ctx = out.getContext('2d')!;
    if (format === 'jpg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, out.width, out.height); }
    ctx.drawImage(srcCanvas, 0, 0);
    out.toBlob((blob) => {
      if (blob) saveBlob(blob, `${baseName}.${format}`).then(() => toast(`Saved ${format.toUpperCase()}.`, 'ok'));
    }, format === 'jpg' ? 'image/jpeg' : 'image/png', 0.92);
  };

  const Slider = ({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit?: string; onChange: (v: number) => void }) => (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <span className="text-xs text-slate-500">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-indigo-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap gap-2 justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-white"><ArrowLeft /> Back</button>
          <span className="font-semibold truncate max-w-[160px]">{baseName}</span>
        </div>
        <div className="flex items-center gap-2">
          <select defaultValue="" onChange={(e) => { const v = e.target.value as any; e.currentTarget.selectedIndex = 0; if (v) exportImage(v); }}
            className="px-3 py-2 text-sm bg-slate-800 rounded-lg outline-none">
            <option value="" disabled>Export…</option>
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
          </select>
          <button onClick={() => exportImage('png')} className="px-4 py-2 text-sm font-semibold bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-2">
            <Download className="w-4 h-4" /> Save PNG
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* sidebar */}
        <aside className="lg:w-64 shrink-0 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 p-4 space-y-4 lg:max-h-[calc(100vh-53px)] lg:overflow-y-auto">
          {!hasImage ? (
            <label className="block text-center py-6 bg-indigo-600/20 border border-indigo-500/40 rounded-xl cursor-pointer hover:bg-indigo-600/30 text-sm">
              <Maximize2 className="w-6 h-6 mx-auto mb-2 text-indigo-400" />
              Open an image to start
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && loadImageFile(e.target.files[0])} />
            </label>
          ) : (
            <>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Adjust</h3>
              <Slider label="Brightness" value={filters.brightness} min={0} max={200} unit="%" onChange={(v) => setFilters({ ...filters, brightness: v })} />
              <Slider label="Contrast" value={filters.contrast} min={0} max={200} unit="%" onChange={(v) => setFilters({ ...filters, contrast: v })} />
              <Slider label="Saturation" value={filters.saturate} min={0} max={200} unit="%" onChange={(v) => setFilters({ ...filters, saturate: v })} />
              <Slider label="Grayscale" value={filters.grayscale} min={0} max={100} unit="%" onChange={(v) => setFilters({ ...filters, grayscale: v })} />
              <Slider label="Sepia" value={filters.sepia} min={0} max={100} unit="%" onChange={(v) => setFilters({ ...filters, sepia: v })} />
              <Slider label="Invert" value={filters.invert} min={0} max={100} unit="%" onChange={(v) => setFilters({ ...filters, invert: v })} />
              <Slider label="Blur" value={filters.blur} min={0} max={20} unit="px" onChange={(v) => setFilters({ ...filters, blur: v })} />

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => setTransform((t) => ({ ...t, rot: (t.rot + 90) % 360 }))} className="flex items-center justify-center gap-1.5 py-2 bg-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-700"><RotateCw className="w-3.5 h-3.5" /> Rotate</button>
                <button onClick={() => setTransform((t) => ({ ...t, fx: (t.fx * -1) as 1 | -1 }))} className="flex items-center justify-center gap-1.5 py-2 bg-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-700"><FlipHorizontal className="w-3.5 h-3.5" /> Flip H</button>
                <button onClick={() => setTransform((t) => ({ ...t, fy: (t.fy * -1) as 1 | -1 }))} className="flex items-center justify-center gap-1.5 py-2 bg-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-700"><FlipVertical className="w-3.5 h-3.5" /> Flip V</button>
                <button onClick={() => { setFilters(DEFAULT_FILTERS); setTransform(DEFAULT_TRANSFORM); setStrokes([]); }}
                  className="flex items-center justify-center gap-1.5 py-2 bg-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-700"><ResetIcon className="w-3.5 h-3.5" /> Reset all</button>
              </div>

              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pt-2">Draw &amp; Overlays</h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setDrawingMode(!drawingMode)}
                  className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${drawingMode ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                  <PenTool className="w-3.5 h-3.5" /> {drawingMode ? 'Drawing' : 'Draw'}
                </button>
                <button onClick={() => setStrokes((s) => s.slice(0, -1))} disabled={!strokes.length}
                  className="py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40">
                  <Undo2 className="w-3.5 h-3.5" /> Undo
                </button>
                <button onClick={() => setStrokes([])} disabled={!strokes.length}
                  className="py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40">
                  <Eraser className="w-3.5 h-3.5" /> Clear ink
                </button>
                <label className="py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 cursor-pointer">
                  <ImagePlus className="w-3.5 h-3.5" /> Stamp image
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => addStampImage(e.target.files?.[0])} />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
                <input type="range" min={1} max={40} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="flex-1 h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-indigo-500" />
                <span className="text-xs text-slate-500 w-6">{brushSize}</span>
              </div>
              <div className="flex gap-2">
                <input value={textOverlay} onChange={(e) => setTextOverlay(e.target.value)} placeholder="Text stamp…"
                  className="flex-1 min-w-0 px-2 py-1.5 bg-slate-800 rounded-md text-xs outline-none" />
                <button onClick={addTextOverlay} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-md"><Type className="w-4 h-4" /></button>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Tip: click anywhere on the image (draw mode off) to place the text/image stamp anchor there.
              </p>
            </>
          )}
        </aside>

        {/* canvas */}
        <main className="flex-1 flex items-center justify-center p-4 lg:p-8 overflow-auto min-h-[50vh]">
          {hasImage ? (
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endStroke}
              onPointerLeave={endStroke}
              className={`max-w-full max-h-[80vh] w-auto h-auto object-contain shadow-2xl rounded-lg touch-none ${drawingMode ? 'cursor-crosshair' : 'cursor-default'}`}
            />
          ) : (
            <p className="text-slate-600">Open an image to start editing.</p>
          )}
        </main>
      </div>
    </div>
  );
}
