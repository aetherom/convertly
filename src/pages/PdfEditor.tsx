import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import * as pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function PdfEditor() {
  const location = useLocation();
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!location.state || !location.state.file) {
      window.location.href = '/';
      return;
    }
    const file = location.state.file as File;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        // FIX: Clone buffer to prevent detached ArrayBuffer crash in Vite
        const clonedBuffer = arrayBuffer.slice(0);
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(clonedBuffer) });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
      } catch (err) {
        console.error("PDF Load Error:", err);
        alert("Failed to load PDF.");
        window.location.href = '/';
      }
    };
    reader.readAsArrayBuffer(file);
  }, [location.state]);

  useEffect(() => {
    const renderPage = async () => {
      if (pdfDoc && canvasRef.current) {
        try {
          const page = await pdfDoc.getPage(currentPage);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport }).promise;
          }
        } catch (err) {
          console.error("Render Error:", err);
        }
      }
    };
    renderPage();
  }, [pdfDoc, currentPage]);

  const handleExport = async () => {
    if (!location.state || !location.state.file) return;
    const file = location.state.file as File;
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exported-${file.name}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!pdfDoc) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading PDF...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 text-slate-400 hover:text-white">
          <ArrowLeft /> Back
        </button>
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} className="px-4 py-2 bg-slate-800 rounded-lg disabled:opacity-50" disabled={currentPage === 1}>Prev</button>
          <span className="text-slate-400">{currentPage} / {numPages}</span>
          <button onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))} className="px-4 py-2 bg-slate-800 rounded-lg disabled:opacity-50" disabled={currentPage === numPages}>Next</button>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>
      <div className="flex justify-center">
        <canvas ref={canvasRef} className="shadow-2xl rounded-lg" />
      </div>
    </div>
  );
}
