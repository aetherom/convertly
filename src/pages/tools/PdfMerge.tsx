import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';
import { ArrowLeft, ArrowDown, ArrowUp, Combine, Download, X } from 'lucide-react';
import { saveBlob } from '../../lib/save';
import { useToast } from '../../components/Toaster';

export default function PdfMerge() {
  const navigate = useNavigate();
  const toast = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const move = (i: number, dir: -1 | 1) => {
    setFiles((prev) => {
      const next = prev.slice();
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const merge = async () => {
    if (files.length < 2) return toast('Pick at least two PDFs.', 'err');
    setBusy(true);
    try {
      const out = await PDFDocument.create();
      for (const f of files) {
        const src = await PDFDocument.load(await f.arrayBuffer());
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      }
      await saveBlob(new Blob([await out.save()], { type: 'application/pdf' }), 'merged.pdf');
      toast(`Merged ${files.length} documents.`, 'ok');
    } catch {
      toast('Merge failed — one of these PDFs may be encrypted.', 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <button onClick={() => navigate('/tools')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6"><ArrowLeft /> Back to Tools</button>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Combine className="text-blue-400" /> Merge PDFs</h1>

      <div className="max-w-2xl">
        <div onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors">
          <p className="text-slate-400">{files.length ? `${files.length} PDFs — top merges first` : 'Click to add PDFs (order shown below)'}</p>
          <input ref={inputRef} type="file" accept=".pdf" multiple className="hidden"
            onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])} />
        </div>

        <ul className="mt-4 space-y-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 flex items-center gap-2 text-sm">
              <span className="text-slate-500 w-6 text-center">{i + 1}</span>
              <span className="flex-1 truncate">{f.name}</span>
              <button onClick={() => move(i, -1)} className="p-1 hover:bg-slate-800 rounded disabled:opacity-30" disabled={i === 0}><ArrowUp className="w-4 h-4" /></button>
              <button onClick={() => move(i, 1)} className="p-1 hover:bg-slate-800 rounded disabled:opacity-30" disabled={i === files.length - 1}><ArrowDown className="w-4 h-4" /></button>
              <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="p-1 hover:bg-red-900/60 text-red-400 rounded"><X className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>

        <button onClick={merge} disabled={busy || files.length < 2}
          className="mt-6 w-full py-3 bg-indigo-600 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> {busy ? 'Merging…' : 'Merge & Download'}
        </button>
      </div>
    </div>
  );
}
