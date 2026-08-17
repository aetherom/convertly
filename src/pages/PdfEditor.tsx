import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import { Download, FileType2, RotateCw, Plus, Minus, FileText, ArrowLeft, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// @ts-ignore
declare let pdfjsLib: any;

export default function PdfEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  const [fileName, setFileName] = useState('untitled');
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [textContent, setTextContent] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFile = async (file: File) => {
    setFileName(file.name.split('.')[0]);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const bytes = new Uint8Array(e.target?.result as ArrayBuffer);
      setPdfBytes(bytes);
      renderPdf(bytes);
      extractText(bytes);
    };
    reader.readAsArrayBuffer(file);
  };

  useEffect(() => {
    const file = location.state?.file as File | undefined;
    if (file) loadFile(file);
  }, [location.state]);

  // FIXED: Robust PDF.js Worker Setup
  const renderPdf = async (bytes: Uint8Array) => {
    if (!pdfjsLib || !canvasRef.current) return;
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.2 });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) { console.error("PDF Render Error", err); }
  };

  const extractText = async (bytes: Uint8Array) => {
    if (!pdfjsLib) return;
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ') + '\n\n';
      }
      setTextContent(text);
    } catch (err) { console.error("Text Extract Error", err); }
  };

  const triggerDownload = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format: string) => {
    if (!pdfBytes) return;
    const pdfDoc = await PDFDocument.load(pdfBytes);
    if (format === 'pdf') {
      const newPdfDoc = await PDFDocument.create();
      const helveticaFont = await newPdfDoc.embedFont(StandardFonts.Helvetica);
      const lines = textContent.split('\n');
      let y = 750;
      let page = newPdfDoc.addPage([600, 800]);
      lines.forEach(line => {
        if (y < 50) { page = newPdfDoc.addPage([600, 800]); y = 750; }
        page.drawText(line.substring(0, 80), { x: 50, y, size: 12, font: helveticaFont, color: rgb(0, 0, 0) });
        y -= 20;
      });
      const newBytes = await newPdfDoc.save();
      triggerDownload(new Blob([newBytes], { type: 'application/pdf' }), `${fileName}_edited.pdf`);
    } else { triggerDownload(new Blob([textContent], { type: 'text/plain' }), `${fileName}.txt`); }
  };

  const rotatePage = async () => {
    if (!pdfBytes) return;
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    pages[0].setRotation(degrees(pages[0].getRotation().angle + 90));
    const updatedBytes = await pdfDoc.save();
    setPdfBytes(updatedBytes);
    renderPdf(updatedBytes);
  };

  return (
    <div className="min-h-screen bg-slate-800 flex flex-col">
      <header className="bg-slate-900 border-b border-slate-700 px-4 py-3 flex justify-between items-center sticky top-0 z-50 shadow-md no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-700 rounded-md text-slate-300"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex items-center gap-2"><div className="p-1.5 bg-red-600 rounded-lg"><FileType2 className="w-4 h-4 text-white" /></div><h1 className="font-bold text-slate-100">Fileverse PDF</h1></div>
        </div>
        <div className="flex gap-2 items-center">
          <input type="file" accept="application/pdf" ref={fileInputRef} onChange={e => e.target.files && loadFile(e.target.files[0])} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-300" title="Upload PDF"><Upload className="w-5 h-5" /></button>
          <button onClick={rotatePage} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-300" title="Rotate Page"><RotateCw className="w-5 h-5" /></button>
          <button onClick={() => handleExport('txt')} className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-600 flex items-center gap-2"><FileText className="w-4 h-4" /> Export TXT</button>
          <button onClick={() => handleExport('pdf')} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-500 flex items-center gap-2"><Download className="w-4 h-4" /> Save PDF</button>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col lg:flex-row gap-6 overflow-auto">
        <div id="print-area" className="flex-1 flex items-center justify-center bg-slate-950 rounded-xl p-4 overflow-auto">
          <canvas ref={canvasRef} className="max-w-full shadow-2xl rounded-lg"></canvas>
        </div>
        <div className="w-full lg:w-96 bg-slate-900 rounded-xl p-4 border border-slate-700 flex flex-col no-print">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Extracted Text Editor</h3>
          <textarea value={textContent} onChange={e => setTextContent(e.target.value)} className="flex-1 w-full h-[60vh] p-3 bg-slate-800 text-slate-200 outline-none resize-none text-sm leading-relaxed font-mono border border-slate-700 rounded-lg focus:ring-2 focus:ring-red-500" placeholder="Upload a PDF to extract text. Edits here will be burned into the new PDF on export." />
        </div>
      </main>
    </div>
  );
}
