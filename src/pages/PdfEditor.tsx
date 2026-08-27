import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { ArrowLeft, Download, ChevronLeft, ChevronRight, RotateCcw, RotateCw, Trash2, TextCursorInput, ZoomIn, ZoomOut, Save } from 'lucide-react';
import { saveBlob } from '../lib/save';
import { useToast } from '../components/Toaster';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfEditor() {
  const location = useLocation() as any;
  const navigate = useNavigate();
  const toast = useToast();
  const incoming: File | undefined = location.state?.file;

  const [file, setFile] = useState<File | undefined>(incoming);
  const [doc, setDoc] = useState<any>(null);
  const [pageIds, setPageIds] = useState<number[]>([]);
  const [rotations, setRotations] = useState<Map<number, number>>(new Map());
  const [pos, setPos] = useState(0);
  const [zoom, setZoom] = useState(1.5);
  const [mode, setMode] = useState<'view' | 'text'>('view');
  const [textContent, setTextContent] = useState('');
  const [fileName, setFileName] = useState('document');
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* ---- Load PDF ---- */
  const loadFile = useCallback(async (f: File) => {
    setLoading(true);
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
      setDoc(pdf);
      setPageIds(Array.from({ length: pdf.numPages }, (_, i) => i));
      setRotations(new Map());
      setPos(0);
      setFileName(f.name.replace(/\.[^.]+$/, ''));
      setMode('view');
      setTextContent('');
    } catch {
      toast('Failed to open that PDF (it may be corrupt or encrypted).', 'err');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { if (incoming) loadFile(incoming); }, [incoming, loadFile]);

  /* ---- Render current page ---- */
  useEffect(() => {
    (async () => {
      if (!doc || !canvasRef.current || mode !== 'view' || !pageIds.length) return;
      const pageId = pageIds[Math.min(pos, pageIds.length - 1)];
      try {
        const page = await doc.getPage(pageId + 1);
        const viewport = page.getViewport({ scale: zoom });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        console.warn(err);
      }
    })();
  }, [doc, pos, zoom, mode, pageIds]);

  /* ---- Page ops ---- */
  const curRotation = () => {
    const pid = pageIds[pos] ?? 0;
    return rotations.get(pid) ?? 0;
  };

  const rotateCurrent = (delta: number) => {
    const pid = pageIds[pos];
    if (pid == null) return;
    setRotations((prev) => {
      const next = new Map(prev);
      next.set(pid, ((((next.get(pid) ?? 0) + delta) % 360) + 360) % 360);
      return next;
    });
  };

  const deleteCurrent = () => {
    if (pageIds.length <= 1) return toast("Can't delete the only page.", 'err');
    setPageIds((prev) => {
      const next = prev.filter((_, i) => i !== pos);
      setPos((p) => Math.max(0, Math.min(p, next.length - 1)));
      return next;
    });
    toast('Page marked for removal (applied on Save).');
  };

  /* ---- Extract text ---- */
  const extractAllText = async () => {
    if (!doc) return;
    setLoading(true);
    try {
      let out = '';
      for (const pid of pageIds) {
        const page = await doc.getPage(pid + 1);
        const tc = await page.getTextContent();
        tc.items.forEach((item: any) => {
          out += item.str ?? '';
          if (item.hasEOL) out += '\n';
        });
        out += '\n\n';
      }
      setTextContent(out.trim());
      setMode('text');
    } finally {
      setLoading(false);
    }
  };

  /* ---- Save edited text as a brand-new PDF ---- */
  const saveEditedTextAsPdf = async () => {
    const newDoc = await PDFDocument.create();
    const font = await newDoc.embedFont(StandardFonts.Helvetica);
    const WIN_ANSI_SAFE = /[^\u0000-\u00FF]/g;
    const lines = textContent.split('\n').flatMap((para) => {
      // rough wrap ~92 chars/line at 12pt on 600pt page
      if (para.length <= 95) return [para.replace(WIN_ANSI_SAFE, '?')];
      const wrapped: string[] = [];
      for (let i = 0; i < para.length; i += 95) wrapped.push(para.slice(i, i + 95).replace(WIN_ANSI_SAFE, '?'));
      return wrapped;
    });

    let page = newDoc.addPage([600, 800]);
    let y = 750;
    for (const line of lines) {
      if (y < 60) { page = newDoc.addPage([600, 800]); y = 750; }
      page.drawText(line, { x: 52, y, size: 12, font, color: rgb(0.05, 0.09, 0.16) });
      y -= 20;
    }
    await saveBlob(new Blob([await newDoc.save()], { type: 'application/pdf' }), `${fileName}-edited.pdf`);
    toast('Saved edited PDF.', 'ok');
  };

  /* ---- Save organized PDF (delete + rotations applied, real reorder-safe rebuild) ---- */
  const saveOrganizedPdf = async () => {
    if (!file) return;
    try {
      const src = await PDFDocument.load(await file.arrayBuffer());
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, pageIds);
      copied.forEach((p, i) => {
        const pid = pageIds[i];
        const extra = rotations.get(pid) ?? 0;
        if (extra) p.setRotation(degrees((p.getRotation().angle + extra) % 360));
        out.addPage(p);
      });
      await saveBlob(new Blob([await out.save()], { type: 'application/pdf' }), `${fileName}-organized.pdf`);
      toast('Saved organized PDF.', 'ok');
    } catch {
      toast('Saving failed — is this PDF protected?', 'err');
    }
  };

  const total = pageIds.length;
  const visualRotation = curRotation();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap gap-2 justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-white"><ArrowLeft /> Back</button>
          <span className="font-semibold truncate max-w-[180px]">{file?.name ?? 'No file'}</span>
        </div>

        {!doc ? (
          <label className="cursor-pointer px-4 py-2 text-sm font-semibold bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-2">
            <Save className="w-4 h-4" /> Open a PDF
            <input type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
          </label>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700"><ZoomOut className="w-4 h-4" /></button>
            <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700"><ZoomIn className="w-4 h-4" /></button>
            <span className="mx-1 text-sm text-slate-400">{pos + 1} / {total}</span>
            <button onClick={() => setPos((p) => Math.max(0, p - 1))} disabled={pos === 0} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setPos((p) => Math.min(total - 1, p + 1))} disabled={pos >= total - 1} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            <button onClick={() => rotateCurrent(-90)} title="Rotate left" className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700"><RotateCcw className="w-4 h-4" /></button>
            <button onClick={() => rotateCurrent(90)} title="Rotate right" className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700"><RotateCw className="w-4 h-4" /></button>
            <button onClick={deleteCurrent} title="Delete page" className="p-2 bg-red-900/70 text-red-200 rounded-lg hover:bg-red-800"><Trash2 className="w-4 h-4" /></button>
            <button onClick={extractAllText} className="px-3 py-2 text-xs bg-slate-800 rounded-lg hover:bg-slate-700 flex items-center gap-1.5">
              <TextCursorInput className="w-4 h-4" /> Extract text
            </button>
            <button onClick={saveOrganizedPdf} className="px-4 py-2 text-sm font-semibold bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-2">
              <Download className="w-4 h-4" /> Save PDF
            </button>
          </div>
        )}
      </header>

      {!doc ? (
        <main className="flex-1 flex items-center justify-center text-slate-500 p-8 text-center">
          <div>
            <p className="mb-4">Open a PDF to view pages, rotate, delete, or pull out the text.</p>
            <label className="cursor-pointer inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Choose PDF…
              <input type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
            </label>
          </div>
        </main>
      ) : loading ? (
        <main className="flex-1 flex items-center justify-center text-slate-500">Working…</main>
      ) : mode === 'view' ? (
        <main className="flex-1 overflow-auto p-6 flex justify-center items-start">
          <canvas
            ref={canvasRef}
            className="shadow-2xl rounded-lg bg-white max-w-full"
            style={{ transform: `rotate(${visualRotation}deg)`, transition: 'transform .2s' }}
          />
        </main>
      ) : (
        <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4 gap-3">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Editable text from the PDF</h2>
            <div className="flex gap-2">
              <button onClick={() => setMode('view')} className="px-3 py-1.5 text-xs bg-slate-800 rounded-lg hover:bg-slate-700">Back to view</button>
              <button onClick={saveEditedTextAsPdf} className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" /> Save as new PDF
              </button>
              <button onClick={() => saveBlob(new Blob([textContent], { type: 'text/plain' }), `${fileName}.txt`)} className="px-3 py-1.5 text-xs bg-slate-800 rounded-lg hover:bg-slate-700">Save .txt</button>
            </div>
          </div>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            spellCheck={false}
            className="flex-1 min-h-[60vh] w-full p-4 bg-slate-900 border border-slate-700 rounded-xl outline-none resize-none font-mono text-sm text-slate-200 focus:ring-2 ring-indigo-500"
          />
          <p className="text-xs text-slate-500">Saving generates a clean new PDF from this text (characters outside Latin-1 become "?").</p>
        </main>
      )}
    </div>
  );
}
