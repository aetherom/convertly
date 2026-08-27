import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { ArrowLeft, ScissorsLineDashed, Download } from 'lucide-react';
import { saveBlob } from '../../lib/save';
import { useToast } from '../../components/Toaster';

/** Parses "1-3,5,8-10" → [[1,3],[5,5],[8,10]] clamped to pageCount. */
function parseRanges(input: string, pageCount: number): [number, number][] {
  const out: [number, number][] = [];
  for (const token of input.split(',')) {
    const m = /^\s*(\d+)?\s*(-)?\s*(\d+)?\s*$/.exec(token);
    if (!m) continue;
    const [, aStr, dash, bStr] = m;
    if (!dash) {
      const a = parseInt(aStr ?? '', 10);
      if (!a || a < 1 || a > pageCount) continue;
      out.push([a, a]);
    } else {
      const a = Math.max(1, parseInt(aStr ?? '1', 10) || 1);
      const b = Math.min(pageCount, parseInt(bStr ?? String(pageCount), 10) || pageCount);
      if (a <= b) out.push([a, b]);
    }
  }
  return out.sort((x, y) => x[0] - y[0]);
}

export default function PdfSplit() {
  const navigate = useNavigate();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [rangeText, setRangeText] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async (f?: File) => {
    if (!f) return;
    setFile(f);
    try {
      const doc = await PDFDocument.load(await f.arrayBuffer());
      setPageCount(doc.getPageCount());
    } catch {
      toast('Could not read that PDF.', 'err');
      setFile(null);
    }
  };

  const run = async () => {
    if (!file || !pageCount) return;
    const ranges = parseRanges(rangeText, pageCount);
    if (!ranges.length) return toast('No valid ranges. Example: 1-3,5', 'err');
    setBusy(true);
    try {
      const src = await PDFDocument.load(await file.arrayBuffer());
      const stem = file.name.replace(/\.pdf$/i, '');
      const pieces: { name: string; bytes: Uint8Array }[] = [];

      for (const [a, b] of ranges) {
        const doc = await PDFDocument.create();
        const indices = Array.from({ length: b - a + 1 }, (_, i) => a - 1 + i);
        const pages = await doc.copyPages(src, indices);
        pages.forEach((p) => doc.addPage(p));
        pieces.push({
          name: `${stem}_p${a}-${b}.pdf`,
          bytes: await doc.save(),
        });
      }

      if (pieces.length === 1) {
        await saveBlob(new Blob([pieces[0].bytes], { type: 'application/pdf' }), pieces[0].name);
      } else {
        const zip = new JSZip();
        pieces.forEach((p) => zip.file(p.name, p.bytes));
        await saveBlob(await zip.generateAsync({ type: 'blob' }), `${stem}-split.zip`);
      }
      toast(`Created ${pieces.length} file${pieces.length > 1 ? 's (ZIP)' : ''}.`, 'ok');
    } catch {
      toast('Splitting failed.', 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <button onClick={() => navigate('/tools')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6"><ArrowLeft /> Back to Tools</button>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><ScissorsLineDashed className="text-rose-400" /> Split PDF</h1>

      <div className="max-w-2xl space-y-4">
        <div onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors">
          <p className="text-slate-400">{file ? `${file.name} — ${pageCount} pages` : 'Click to choose a PDF'}</p>
          <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </div>

        {file && (
          <>
            <label className="block">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ranges</span>
              <input value={rangeText} onChange={(e) => setRangeText(e.target.value)} placeholder={`e.g. 1-${Math.min(3, pageCount)},5`}
                className="mt-1 w-full p-3 bg-slate-900 rounded-lg border border-slate-700 outline-none font-mono text-sm focus:ring-2 ring-indigo-500" />
              <span className="text-xs text-slate-500 mt-1 block">Comma-separated pages or spans. Multiple ranges → ZIP of separate PDFs.</span>
            </label>
            <button onClick={run} disabled={busy}
              className="w-full py-3 bg-indigo-600 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> {busy ? 'Working…' : 'Split'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
