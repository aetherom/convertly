import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import { ArrowLeft, Stamp, Download } from 'lucide-react';
import { saveBlob } from '../../lib/save';
import { useToast } from '../../components/Toaster';

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

export default function PdfWatermark() {
  const navigate = useNavigate();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(0.15);
  const [tiled, setTiled] = useState(false);
  const [color, setColor] = useState('#374151');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const run = async () => {
    if (!file) return toast('Choose a PDF first.', 'err');
    setBusy(true);
    try {
      const doc = await PDFDocument.load(await file.arrayBuffer());
      const wmFont = await doc.embedFont(StandardFonts.HelveticaBold);
      const col = hexToRgb(color);
      const safe = text.replace(/[^\u0000-\u00FF]/g, '?') || 'WATERMARK';
      const tw = wmFont.widthOfTextAtSize(safe, fontSize);

      for (const page of doc.getPages()) {
        const { width, height } = page.getSize();
        if (tiled) {
          const stepX = tw + fontSize * 2;
          const stepY = fontSize * 4;
          for (let y = -stepY; y < height + stepY; y += stepY) {
            for (let x = -stepX; x < width + stepX; x += stepX) {
              page.drawText(safe, { x, y, size: fontSize, font: wmFont, color: col, opacity, rotate: degrees(30) });
            }
          }
        } else {
          page.drawText(safe, {
            x: width / 2 - tw / 2,
            y: height / 2 - fontSize / 2,
            size: fontSize,
            font: wmFont,
            color: col,
            opacity,
            rotate: degrees(30),
          });
        }
      }
      await saveBlob(
        new Blob([await doc.save()], { type: 'application/pdf' }),
        file.name.replace(/\.pdf$/i, '-watermarked.pdf')
      );
      toast('Watermarked PDF saved.', 'ok');
    } catch {
      toast('Watermarking failed — PDF may be encrypted.', 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <button onClick={() => navigate('/tools')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6"><ArrowLeft /> Back to Tools</button>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Stamp className="text-teal-400" /> Watermark PDF</h1>

      <div className="max-w-2xl space-y-4">
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors"
        >
          <p className="text-slate-400">{file ? file.name : 'Click to choose a PDF'}</p>
          <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>

        <label className="block">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Text</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mt-1 w-full p-3 bg-slate-900 rounded-lg border border-slate-700 outline-none focus:ring-2 ring-indigo-500"
          />
        </label>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <label>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Size: {fontSize}px</span>
            <input type="range" min={16} max={140} value={fontSize} onChange={(e) => setFontSize(+e.target.value)}
              className="w-full mt-2 h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-indigo-500" />
          </label>
          <label>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Opacity: {opacity.toFixed(2)}</span>
            <input type="range" min={5} max={80} value={opacity * 100} onChange={(e) => setOpacity(+e.target.value / 100)}
              className="w-full mt-2 h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-indigo-500" />
          </label>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={tiled} onChange={(e) => setTiled(e.target.checked)} className="accent-indigo-500" />
            Tile across the page
          </label>
          <label className="flex items-center gap-2">
            Colour
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
          </label>
        </div>

        <button
          onClick={run}
          disabled={busy || !file}
          className="w-full py-3 bg-indigo-600 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" /> {busy ? 'Stamping…' : 'Apply Watermark'}
        </button>
      </div>
    </div>
  );
}
