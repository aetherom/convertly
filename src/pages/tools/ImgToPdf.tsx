import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';
import { ArrowLeft, ArrowDown, ArrowUp, Images, Download, X } from 'lucide-react';
import { saveBlob } from '../../lib/save';
import { useToast } from '../../components/Toaster';

async function toEmbeddable(file: File): Promise<{ bytes: Uint8Array; jpeg: boolean }> {
  const isJpeg = /jpe?g/i.test(file.type);
  const isPng = file.type === 'image/png';
  if (isJpeg || isPng) return { bytes: new Uint8Array(await file.arrayBuffer()), jpeg: isJpeg };
  // SVG/GIF/WebP → rasterise through canvas to PNG
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('bad image'));
      img.src = url;
    });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || 800;
    c.height = img.naturalHeight || 600;
    c.getContext('2d')!.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
    return { bytes: new Uint8Array(await blob!.arrayBuffer()), jpeg: false };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ImgToPdf() {
  const navigate = useNavigate();
  const toast = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [pageSize, setPageSize] = useState<'auto' | 'a4'>('auto');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const move = (i: number, dir: -1 | 1) =>
    setFiles((prev) => {
      const next = prev.slice();
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const build = async () => {
    if (!files.length) return toast('Add at least one image.', 'err');
    setBusy(true);
    try {
      const pdf = await PDFDocument.create();
      for (const f of files) {
        let page: ReturnType<typeof pdf.addPage>;
        if (pageSize === 'a4') {
          page = pdf.addPage([595.28, 841.89]);
        } else {
          const probe = await toEmbeddable(f);
          const decoded = f.type.includes('jpeg')
            ? await pdf.embedJpg(probe.bytes)
            : await pdf.embedPng(probe.bytes);
          page = pdf.addPage([decoded.width * 0.75, decoded.height * 0.75]); // CSS px → pt
        }
        const { width: pw, height: ph } = page.getSize();
        const { bytes, jpeg } = await toEmbeddable(f);
        const img = jpeg ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);
        const margin = pageSize === 'a4' ? 24 : 0;
        const availW = pw - margin * 2;
        const availH = ph - margin * 2;
        const scale = Math.min(availW / img.width, availH / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
      }
      await saveBlob(new Blob([await pdf.save()], { type: 'application/pdf' }), 'images.pdf');
      toast(`Built a ${pdf.getPageCount()}-page PDF.`, 'ok');
    } catch {
      toast('Conversion failed — one file may be unreadable.', 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <button onClick={() => navigate('/tools')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6"><ArrowLeft /> Back to Tools</button>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Images className="text-purple-400" /> Images → PDF</h1>

      <div className="max-w-2xl space-y-4">
        <div onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors">
          <p className="text-slate-400">{files.length ? `${files.length} images — order shown below` : 'Click to add images (JPG, PNG, WebP, GIF, SVG)'}</p>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])} />
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-400">Page size:</span>
          {(['auto', 'a4'] as const).map((s) => (
            <button key={s} onClick={() => setPageSize(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${pageSize === s ? 'bg-indigo-600' : 'bg-slate-800 hover:bg-slate-700'}`}>
              {s === 'auto' ? 'Match image' : 'A4 (fit & centre)'}
            </button>
          ))}
        </div>

        <ul className="space-y-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 flex items-center gap-2 text-sm">
              <span className="text-slate-500 w-6 text-center">{i + 1}</span>
              <span className="flex-1 truncate">{f.name}</span>
              <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1 hover:bg-slate-800 rounded disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
              <button onClick={() => move(i, 1)} disabled={i === files.length - 1} className="p-1 hover:bg-slate-800 rounded disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
              <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="p-1 hover:bg-red-900/60 text-red-400 rounded"><X className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>

        <button onClick={build} disabled={busy || !files.length}
          className="w-full py-3 bg-indigo-600 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> {busy ? 'Building…' : 'Create PDF'}
        </button>
      </div>
    </div>
  );
}
