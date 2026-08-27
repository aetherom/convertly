import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, RotateCw, FlipHorizontal, FlipVertical, PenTool,
  Undo2, Type, ImagePlus, RotateCcw as ResetIcon,
} from 'lucide-react';
import { saveBlob } from '../lib/save';
import { useToast } from '../components/Toaster';

const MAX_DIM = 2400;

/* ---------------- types ---------------- */
interface Filters {
  brightness: number; contrast: number; saturate: number;
  grayscale: number; sepia: number; invert: number; blur: number;
}
const DEFAULT_FILTERS: Filters =
  { brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, invert: 0, blur: 0 };
const filterCss = (f: Filters) =>
  `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) grayscale(${f.grayscale}%) sepia(${f.sepia}%) invert(${f.invert}%) blur(${f.blur}px)`;

interface Transform { rot: number; fx: number; fy: number; }
const DEFAULT_TRANSFORM: Transform = { rot: 0, fx: 1, fy: 1 };

interface Pt { x: number; y: number; }

type Overlay =
  | { kind: 'ink'; color: string; size: number; pts: Pt[] }
  | { kind: 'text'; color: string; sizePx: number; text: string; x: number; y: number }
  | { kind: 'stamp'; img: HTMLImageElement; x: number; y: number; w: number; h: number };

/* ---------------- UI atom ---------------- */
function Slider({ label, value, min, max, unit, onChange }: {
  label: string; value: number; min: number; max: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <span className="text-xs text-slate-500">{value}{unit ?? ''}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-indigo-500" />
    </div>
  );
}

/* ---------------- component ---------------- */
export default function ImageEditor() {
  const navigate = useNavigate();
  const toast = useToast();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const draftRef = useRef<{ color: string; size: number; pts: Pt[] } | null>(null);
  const rafRef = useRef<number | null>(null);
  const anchorRef = useRef<Pt | null>(null);

  const [hasImage, setHasImage] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [transform, setTransform] = useState<Transform>(DEFAULT_TRANSFORM);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [drawingMode, setDrawingMode] = useState(false);
  const [brushColor, setBrushColor] = useState('#ff2222');
  const [brushSize, setBrushSize] = useState(5);
  const [textValue, setTextValue] = useState('');
  const [baseName, setBaseName] = useState('edited');

  /* Live mirror of everything the painter needs — event handlers and RAF
     always read THIS, never stale closures or mutable-shared refs. */
  const sceneRef = useRef({ filters, transform, overlays });
  sceneRef.current = { filters, transform, overlays };

  /* -------- master painter -------- */
  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !hasImage) return;

    const { filters: f, transform: t, overlays: list } = sceneRef.current;
    const rotated = t.rot % 180 !== 0;
    const cw = rotated ? img.naturalHeight : img.naturalWidth;
    const ch = rotated ? img.naturalWidth : img.naturalHeight;
    if (canvas.width !== cw) canvas.width = cw;
    if (canvas.height !== ch) canvas.height = ch;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // include the in-progress stroke, if any
    const all: Overlay[] = [...list];
    const draft = draftRef.current;
    if (draft && draft.pts.length > 0) {
      all.push({ kind: 'ink', color: draft.color, size: draft.size, pts: draft.pts });
    }

    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.translate(cw / 2, ch / 2);
    ctx.rotate((t.rot * Math.PI) / 180);
    ctx.scale(t.fx, t.fy);

    ctx.filter = filterCss(f);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.filter = 'none';

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const nx = img.naturalWidth / 2;
    const ny = img.naturalHeight / 2;

    for (const o of all) {
      if (!o) continue; // defensive: skip garbage instead of crashing
      if (o.kind === 'ink') {
        if (!o.pts || o.pts.length === 0) continue;
        if (o.pts.length === 1) {
          ctx.fillStyle = o.color;
          ctx.beginPath();
          ctx.arc(o.pts[0].x, o.pts[0].y, Math.max(0.5, o.size / 2), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = o.color;
          ctx.lineWidth = o.size;
          ctx.beginPath();
          ctx.moveTo(o.pts[0].x, o.pts[0].y);
          for (let i = 1; i < o.pts.length; i++) ctx.lineTo(o.pts[i].x, o.pts[i].y);
          ctx.stroke();
        }
      } else if (o.kind === 'text') {
        ctx.fillStyle = o.color;
        ctx.font = `${o.sizePx}px Arial`;
        ctx.fillText(o.text, o.x - nx, o.y - ny);
      } else {
        ctx.drawImage(o.img, o.x - nx, o.y - ny, o.w, o.h);
      }
    }
    ctx.restore();
  }, [hasImage]);

  /* throttle repaints to animation frames */
  const schedulePaint = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      paint();
    });
  }, [paint]);

  useEffect(() => { paint(); }, [paint, filters, transform, overlays]);

  /* -------- loading -------- */
  const adoptImage = useCallback((img: HTMLImageElement) => {
    imgRef.current = img;
    setFilters(DEFAULT_FILTERS);
    setTransform(DEFAULT_TRANSFORM);
    setOverlays([]);
    setHasImage(true);
  }, []);

  const loadImageFile = useCallback((file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const raw = new Image();
    raw.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_DIM / Math.max(raw.naturalWidth, raw.naturalHeight));
      if (scale >= 1) {
        adoptImage(raw);
      } else {
        const tmp = document.createElement('canvas');
        tmp.width = Math.round(raw.naturalWidth * scale);
        tmp.height = Math.round(raw.naturalHeight * scale);
        tmp.getContext('2d')?.drawImage(raw, 0, 0, tmp.width, tmp.height);
        const scaled = new Image();
        scaled.onload = () => adoptImage(scaled);
        scaled.src = tmp.toDataURL('image/png');
      }
      setBaseName(file.name.replace(/\.[^.]+$/, ''));
    };
    raw.onerror = () => { URL.revokeObjectURL(url); toast('Could not read that image.', 'err'); };
    raw.src = url;
  }, [adoptImage, toast]);

  /* -------- pointer maths -------- */
  const dispToImg = (px: number, py: number): Pt => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return { x: 0, y: 0 };
    const th = (-sceneRef.current.transform.rot * Math.PI) / 180;
    const vx = px - canvas.width / 2;
    const vy = py - canvas.height / 2;
    const rx = vx * Math.cos(th) - vy * Math.sin(th);
    const ry = vx * Math.sin(th) + vy * Math.cos(th);
    return {
      x: rx / sceneRef.current.transform.fx + img.naturalWidth / 2,
      y: ry / sceneRef.current.transform.fy + img.naturalHeight / 2,
    };
  };

  const eventToCanvasPx = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      px: (e.clientX - rect.left) * (canvas.width / rect.width),
      py: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  /* finish stroke — snapshot FIRST, mutate ref AFTER, updater touches nothing mutable */
  const finishStroke = () => {
    const draft = draftRef.current;
    if (!draft || draft.pts.length === 0) {
      draftRef.current = null;
      return;
    }
    const committed: Overlay = {
      kind: 'ink',
      color: draft.color,
      size: draft.size,
      pts: draft.pts.slice(),   // independent copy — race-proof
    };
    draftRef.current = null;
    setOverlays((prev) => [...prev, committed]);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!hasImage) return;
    const { px, py } = eventToCanvasPx(e);
    const p = dispToImg(px, py);
    anchorRef.current = p; // stamp/text anchor
    if (!drawingMode) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    draftRef.current = { color: brushColor, size: brushSize, pts: [p] };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const draft = draftRef.current;
    if (!draft) return;
    const { px, py } = eventToCanvasPx(e);
    draft.pts.push(dispToImg(px, py));
    schedulePaint(); // pure canvas redraw — no React involvement while drawing
  };

  const onPointerUp = () => finishStroke();
  const onPointerCancel = () => finishStroke();

  /* -------- tools -------- */
  const requireAnchor = (): Pt => {
    if (anchorRef.current) return anchorRef.current;
    const img = imgRef.current;
    const fallback: Pt = img
      ? { x: img.naturalWidth / 2, y: img.naturalHeight / 2 }
      : { x: 0, y: 0 };
    toast('Click a spot on the image first, then add the stamp.', 'err');
    return fallback;
  };

  const addText = () => {
    const img = imgRef.current;
    if (!img || !textValue.trim()) return;
    const a = requireAnchor();
    const sizePx = Math.max(24, Math.round(Math.min(img.naturalWidth, img.naturalHeight) / 14));
    setOverlays((prev) => [...prev, { kind: 'text', color: brushColor, sizePx, text: textValue, x: a.x, y: a.y }]);
    setTextValue('');
  };

  const addStamp = (file?: File) => {
    const img = imgRef.current;
    if (!file || !img) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const sticker = new Image();
      sticker.onload = () => {
        const a = requireAnchor();
        const w = Math.min(sticker.naturalWidth, img.naturalWidth / 3);
        const h = (sticker.naturalHeight / sticker.naturalWidth) * w;
        setOverlays((prev) => [...prev, { kind: 'stamp', img: sticker, x: a.x, y: a.y, w, h }]);
      };
      sticker.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const exportImage = (format: 'png' | 'jpg') => {
    const src = canvasRef.current;
    if (!src || !hasImage) return;
    const out = document.createElement('canvas');
    out.width = src.width;
    out.height = src.height;
    const ctx = out.getContext('2d')!;
    if (format === 'jpg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
    }
    ctx.drawImage(src, 0, 0);
    out.toBlob(
      (blob) => {
        if (blob) saveBlob(blob, `${baseName}.${format}`).then(() => toast(`Saved ${format.toUpperCase()}.`, 'ok'));
      },
      format === 'jpg' ? 'image/jpeg' : 'image/png',
      0.92
    );
  };

  /* ---------------- render ---------------- */
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap gap-2 justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-white"><ArrowLeft /> Back</button>
          <span className="font-semibold truncate max-w-[160px]">{baseName}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="px-3 py-2 text-sm bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer">
            Open…
            <input type="file" accept="image/*" className="hidden" onChange={(e) => loadImageFile(e.target.files?.[0])} />
          </label>
          <select defaultValue="" onChange={(e) => {
            const v = e.target.value as 'png' | 'jpg' | '';
            e.currentTarget.selectedIndex = 0;
            if (v) exportImage(v);
          }} className="px-3 py-2 text-sm bg-slate-800 rounded-lg outline-none">
            <option value="" disabled>Export…</option>
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
          </select>
          <button onClick={() => exportImage('png')}
            className="px-4 py-2 text-sm font-semibold bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-2">
            <Download className="w-4 h-4" /> Save PNG
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        <aside className="lg:w-64 shrink-0 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 p-4 space-y-4 lg:max-h-[calc(100vh-53px)] lg:overflow-y-auto">
          {!hasImage ? (
            <label className="block text-center py-6 bg-indigo-600/20 border border-indigo-500/40 rounded-xl cursor-pointer hover:bg-indigo-600/30 text-sm">
              Open an image to start
              <input type="file" accept="image/*" className="hidden" onChange={(e) => loadImageFile(e.target.files?.[0])} />
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
                <button onClick={() => setTransform((t) => ({ ...t, rot: (t.rot + 90) % 360 }))}
                  className="flex items-center justify-center gap-1.5 py-2 bg-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-700">
                  <RotateCw className="w-3.5 h-3.5" /> Rotate
                </button>
                <button onClick={() => setTransform((t) => ({ ...t, fx: -t.fx }))}
                  className="flex items-center justify-center gap-1.5 py-2 bg-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-700">
                  <FlipHorizontal className="w-3.5 h-3.5" /> Flip H
                </button>
                <button onClick={() => setTransform((t) => ({ ...t, fy: -t.fy }))}
                  className="flex items-center justify-center gap-1.5 py-2 bg-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-700">
                  <FlipVertical className="w-3.5 h-3.5" /> Flip V
                </button>
                <button onClick={() => { setFilters(DEFAULT_FILTERS); setTransform(DEFAULT_TRANSFORM); setOverlays([]); }}
                  className="flex items-center justify-center gap-1.5 py-2 bg-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-700">
                  <ResetIcon className="w-3.5 h-3.5" /> Reset all
                </button>
              </div>

              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pt-2">Draw &amp; Overlays</h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setDrawingMode(!drawingMode)}
                  className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${drawingMode ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                  <PenTool className="w-3.5 h-3.5" /> {drawingMode ? 'Drawing' : 'Draw'}
                </button>
                <button onClick={() => setOverlays((s) => s.slice(0, -1))} disabled={!overlays.length}
                  className="py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40">
                  <Undo2 className="w-3.5 h-3.5" /> Undo
                </button>
                <button onClick={() => setOverlays([])} disabled={!overlays.length}
                  className="py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40">
                  Clear
                </button>
                <label className="py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 cursor-pointer">
                  <ImagePlus className="w-3.5 h-3.5" /> Stamp img
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => addStamp(e.target.files?.[0])} />
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
                <input type="range" min={1} max={40} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="flex-1 h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-indigo-500" />
                <span className="text-xs text-slate-500 w-6">{brushSize}</span>
              </div>

              <div className="flex gap-2">
                <input value={textValue} onChange={(e) => setTextValue(e.target.value)} placeholder="Text stamp…"
                  className="flex-1 min-w-0 px-2 py-1.5 bg-slate-800 rounded-md text-xs outline-none" />
                <button onClick={addText} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-md"><Type className="w-4 h-4" /></button>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Click anywhere on the photo (draw mode off) to place the anchor, then add text or a stamp image there.
              </p>
            </>
          )}
        </aside>

        <main className="flex-1 flex items-center justify-center p-4 lg:p-8 overflow-auto min-h-[50vh]">
          {hasImage ? (
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onLostPointerCapture={onPointerCancel}
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
