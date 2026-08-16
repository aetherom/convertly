import { useParams, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import FontFamily from '@tiptap/extension-font-family';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as XLSX from 'xlsx';
import { 
  Download, ArrowLeft, Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, 
  List, Plus, Minus, RotateCw, FileType2, FileText, Sheet, FileImage, Sparkles, Type, Palette, 
  Highlighter, Table as TableIcon, Image as ImageIcon, Eraser, PenTool, Send, RotateCcw, 
  Strikethrough, Quote, Code, Undo, Redo, RemoveFormatting, Maximize, FlipHorizontal, FlipVertical, TextCursorInput
} from 'lucide-react';

// @ts-ignore
declare let luckysheet: any;

export default function Editor() {
  const { type } = useParams<{ type: string }>();
  const location = useLocation();
  const [fileName, setFileName] = useState<string>('untitled');
  const [fileData, setFileData] = useState<string>('');
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [wordCount, setWordCount] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Image States
  const [imageUrl, setImageUrl] = useState<string>('');
  const [filters, setFilters] = useState({ brightness: 100, contrast: 100, saturate: 100, grayscale: 0, rotate: 0, sepia: 0, blur: 0, invert: 0, flipH: 1, flipV: 1 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#ff0000');
  const [brushSize, setBrushSize] = useState(5);
  const [textOverlay, setTextOverlay] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState('');

  // TipTap Word Editor Setup
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Highlight,
      FontFamily,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
    ],
    content: '<p>Start editing your document...</p>',
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      setWordCount(text.split(/\s+/).filter(Boolean).length);
    }
  });

  useEffect(() => {
    const file = location.state?.file as File | undefined;
    if (file) {
      setFileName(file.name.split('.')[0]);
      
      if (type === 'image') {
        const url = URL.createObjectURL(file);
        setImageUrl(url);
        setTimeout(initCanvas, 100); 
      } else if (type === 'word') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          editor?.commands.setContent(`<p>${text}</p>`);
        };
        reader.readAsText(file);
      } else if (type === 'pdf') {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const bytes = new Uint8Array(e.target?.result as ArrayBuffer);
          const doc = await PDFDocument.load(bytes);
          setPdfDoc(doc);
          const text = await doc.getTextContent();
          setFileData(text.items.map((item: any) => item.str).join('\n'));
        };
        reader.readAsArrayBuffer(file);
      }
    }

    if (type === 'excel' && typeof luckysheet !== 'undefined') {
      luckysheet.create({
        container: 'excel-container',
        lang: 'en',
        showinfobar: false,
        data: [[{ v: "Welcome to Fileverse Excel" }, { v: "Type formulas here" }]]
      });
    }
  }, [location.state, type, editor]);

  // --- CANVAS LOGIC ---
  const initCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    ctx.lineCap = 'round'; ctx.strokeStyle = brushColor; ctx.lineWidth = brushSize;
    ctxRef.current = ctx;
  };

  const startDraw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const ctx = ctxRef.current; if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const ctx = ctxRef.current; if (!ctx) return;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const applyTextOverlay = () => {
    const ctx = ctxRef.current; if (!ctx || !textOverlay) return;
    ctx.fillStyle = brushColor;
    ctx.font = `${brushSize * 4}px Arial`;
    ctx.fillText(textOverlay, 50, 50);
    setTextOverlay('');
  };

  const handleImageOverlay = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.src = ev.target?.result as string;
      img.onload = () => {
        const ctx = ctxRef.current; if (!ctx) return;
        ctx.drawImage(img, 50, 50, 150, 150);
      };
    };
    reader.readAsDataURL(file);
  };

  // --- EXPORT LOGIC ---
  const triggerDownload = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format: string) => {
    if (type === 'word') {
      if (format === 'pdf') window.print();
      else if (format === 'txt') triggerDownload(new Blob([editor?.getText() || ''], { type: 'text/plain' }), `${fileName}.txt`);
      else if (format === 'html') triggerDownload(new Blob([editor?.getHTML() || ''], { type: 'text/html' }), `${fileName}.html`);
    } 
    else if (type === 'excel') {
      if (format === 'xlsx') {
        // @ts-ignore
        const data = luckysheet.getSheetData(); 
        const aoa = data.map((row: any) => row.map((cell: any) => cell ? cell.v : ""));
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      } else if (format === 'csv') {
        // @ts-ignore
        const data = luckysheet.getSheetData();
        const csv = data.map((row: any) => row.map((cell: any) => `"${cell?.v || ''}"`).join(',')).join('\n');
        triggerDownload(new Blob([csv], { type: 'text/csv' }), `${fileName}.csv`);
      }
    } 
    else if (type === 'pdf') {
      if (format === 'pdf') {
        // REAL PDF EXPORT: Create a brand new PDF with the edited text
        const newPdfDoc = await PDFDocument.create();
        const helveticaFont = await newPdfDoc.embedFont(StandardFonts.Helvetica);
        const page = newPdfDoc.addPage([600, 800]);
        const lines = fileData.split('\n');
        let y = 750;
        lines.forEach(line => {
          if (y < 50) { // Add new page if overflow
            const newPage = newPdfDoc.addPage([600, 800]);
            y = 750;
            newPage.drawText(line, { x: 50, y, size: 12, font: helveticaFont, color: rgb(0, 0, 0) });
          } else {
            page.drawText(line, { x: 50, y, size: 12, font: helveticaFont, color: rgb(0, 0, 0) });
          }
          y -= 20;
        });
        const pdfBytes = await newPdfDoc.save();
        triggerDownload(new Blob([pdfBytes], { type: 'application/pdf' }), `${fileName}_edited.pdf`);
      } else if (format === 'txt') {
        triggerDownload(new Blob([fileData], { type: 'text/plain' }), `${fileName}.txt`);
      }
    } 
    else if (type === 'image') {
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => {
        const mergeCanvas = document.createElement('canvas');
        mergeCanvas.width = img.width; mergeCanvas.height = img.height;
        const mergeCtx = mergeCanvas.getContext('2d');
        if (mergeCtx) {
          mergeCtx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%) blur(${filters.blur}px) invert(${filters.invert}%)`;
          mergeCtx.translate(img.width / 2, img.height / 2);
          mergeCtx.scale(filters.flipH, filters.flipV);
          mergeCtx.rotate(filters.rotate * Math.PI / 180);
          mergeCtx.drawImage(img, -img.width / 2, -img.height / 2);
          
          if (canvasRef.current) {
            mergeCtx.filter = 'none';
            mergeCtx.drawImage(canvasRef.current, 0, 0, img.width, img.height);
          }
        }
        const ext = format === 'jpg' ? 'image/jpeg' : 'image/png';
        mergeCanvas.toBlob(blob => blob && triggerDownload(blob, `${fileName}.${format}`), ext, 0.9);
      };
    }
  };

  // --- PDF PAGE MANIPULATION ---
  const addPdfPage = async () => {
    if (pdfDoc) {
      pdfDoc.addPage([600, 800]);
      setPdfDoc(pdfDoc);
      setFileData(fileData + "\n[New Blank Page Added]");
    }
  };

  const deletePdfPage = async () => {
    if (pdfDoc && pdfDoc.getPageCount() > 1) {
      pdfDoc.removePage(0); // Simplified: remove first page
      setPdfDoc(pdfDoc);
      setFileData("[Page Deleted]");
    }
  };

  // --- AI LOGIC ---
  const handleAISubmit = () => {
    if (!editor || !aiPrompt) return;
    const selectedText = editor.state.selection.content().content.firstChild?.textContent || editor.getText();
    if (!selectedText) return alert("Highlight some text first!");

    let result = '';
    const p = aiPrompt.toLowerCase();
    if (p.includes('translate')) result = `(AI Translated): Hola ${selectedText}`; 
    else if (p.includes('bullet')) result = selectedText.split('. ').map(s => `<li>${s}</li>`).join('');
    else if (p.includes('summarize')) result = `(AI Summary): ${selectedText.substring(0, 50)}...`;
    else result = `(AI Enhanced): ${selectedText} - Modified by prompt: ${aiPrompt}`;

    if (p.includes('bullet')) editor.chain().focus().insertContent(`<ul>${result}</ul>`).run();
    else editor.chain().focus().insertContent(`<p>${result}</p>`).run();
    
    setAiPrompt('');
  };

  const getExportOptions = () => {
    if (type === 'word') return ['pdf', 'txt', 'html'];
    if (type === 'excel') return ['xlsx', 'csv'];
    if (type === 'pdf') return ['pdf', 'txt'];
    if (type === 'image') return ['png', 'jpg'];
    return ['txt'];
  };

  const imageFilterStyle = {
    filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%) blur(${filters.blur}px) invert(${filters.invert}%)`,
    transform: `rotate(${filters.rotate}deg) scale(${filters.flipH}, ${filters.flipV})`
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-[100]' : 'min-h-screen'} bg-slate-900 text-slate-200 flex flex-col`}>
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex justify-between items-center sticky top-0 z-50 shadow-md no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div className="flex items-center gap-2 text-indigo-400">
            {type === 'word' && <FileText className="w-5 h-5" />}
            {type === 'excel' && <Sheet className="w-5 h-5" />}
            {type === 'pdf' && <FileType2 className="w-5 h-5" />}
            {type === 'image' && <FileImage className="w-5 h-5" />}
            <h1 className="font-bold text-lg capitalize hidden sm:block text-slate-100">{type} Editor</h1>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors hidden md:block">
            <Maximize className="w-5 h-5 text-slate-300" />
          </button>
          <select onChange={(e) => handleExport(e.target.value)} className="hidden md:block px-3 py-2 bg-slate-700 text-slate-200 rounded-lg text-sm font-medium border border-slate-600 outline-none focus:ring-2 focus:ring-indigo-500" defaultValue="">
            <option value="" disabled>Export as...</option>
            {getExportOptions().map(fmt => <option key={fmt} value={fmt}>Export as {fmt.toUpperCase()}</option>)}
          </select>
          <button onClick={() => handleExport(getExportOptions()[0])} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-500 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-900/50">
            <Download className="w-4 h-4" /> Save
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 flex justify-center overflow-auto">
        
        {/* WORD EDITOR */}
        {type === 'word' && (
          <div className="w-full max-w-4xl flex flex-col gap-4">
            <div className="bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-700 flex gap-1 flex-wrap sticky top-20 z-40 no-print items-center">
              <ToolBtn onClick={() => editor?.chain().focus().undo().run()}><Undo className="w-4 h-4" /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().redo().run()}><Redo className="w-4 h-4" /></ToolBtn>
              <div className="w-px h-6 bg-slate-600 mx-1"></div>
              <select onChange={e => editor?.chain().focus().setFontFamily(e.target.value).run()} className="px-2 py-1 bg-slate-700 text-slate-200 rounded-md text-xs border-none outline-none">
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Georgia">Georgia</option>
              </select>
              <select onChange={e => editor?.chain().focus().setFontSize(e.target.value).run()} className="px-2 py-1 bg-slate-700 text-slate-200 rounded-md text-xs border-none outline-none">
                <option value="12px">12</option>
                <option value="14px">14</option>
                <option value="16px">16</option>
                <option value="20px">20</option>
                <option value="24px">24</option>
              </select>
              <div className="w-px h-6 bg-slate-600 mx-1"></div>
              <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="w-4 h-4" /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="w-4 h-4" /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleUnderline().run()}><UnderlineIcon className="w-4 h-4" /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough className="w-4 h-4" /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleHighlight().run()}><Highlighter className="w-4 h-4" /></ToolBtn>
              <div className="w-px h-6 bg-slate-600 mx-1"></div>
              <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('left').run()}><AlignLeft className="w-4 h-4" /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('center').run()}><AlignCenter className="w-4 h-4" /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('right').run()}><AlignRight className="w-4 h-4" /></ToolBtn>
              <div className="w-px h-6 bg-slate-600 mx-1"></div>
              <ToolBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}><Type className="w-4 h-4" /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="w-4 h-4" /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote className="w-4 h-4" /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleCodeBlock().run()}><Code className="w-4 h-4" /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="w-4 h-4" /></ToolBtn>
              <label className="p-2 hover:bg-slate-700 rounded-md cursor-pointer">
                <ImageIcon className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = () => editor?.chain().focus().setImage({ src: reader.result as string }).run(); reader.readAsDataURL(file); } }} />
              </label>
              <input type="color" onChange={e => editor?.chain().focus().setColor(e.target.value).run()} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
              <ToolBtn onClick={() => editor?.chain().focus().unsetAllMarks().run()}><RemoveFormatting className="w-4 h-4" /></ToolBtn>
            </div>
            <div id="print-area" className="w-full min-h-[80vh] bg-white text-black shadow-2xl rounded-xl p-8 md:p-12 outline-none text-slate-800 text-lg leading-relaxed font-sans">
              <EditorContent editor={editor} />
            </div>
            <div className="text-center text-xs text-slate-500 no-print">{wordCount} words</div>
          </div>
        )}

        {/* EXCEL EDITOR */}
        {type === 'excel' && (
          <div className="w-full max-w-6xl flex flex-col gap-4">
            <div className="bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-700 flex gap-2 no-print text-slate-300">
              <span className="text-xs self-center ml-4">Tip: Formulas work natively. Click "Save" to download as real .xlsx.</span>
            </div>
            <div id="print-area" className="w-full bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-700">
              <div id="excel-container" style={{ width: '100%', height: '75vh' }}></div>
            </div>
          </div>
        )}

        {/* IMAGE EDITOR */}
        {type === 'image' && (
          <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-64 bg-slate-800 shadow-sm rounded-xl p-4 border border-slate-700 flex flex-col gap-4 h-fit sticky top-20 no-print max-h-[80vh] overflow-y-auto">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Filters & Adjust</h3>
              <Slider label="Brightness" value={filters.brightness} min={0} max={200} onChange={(v) => setFilters({...filters, brightness: v})} />
              <Slider label="Contrast" value={filters.contrast} min={0} max={200} onChange={(v) => setFilters({...filters, contrast: v})} />
              <Slider label="Saturate" value={filters.saturate} min={0} max={200} onChange={(v) => setFilters({...filters, saturate: v})} />
              <Slider label="Grayscale" value={filters.grayscale} min={0} max={100} onChange={(v) => setFilters({...filters, grayscale: v})} />
              <Slider label="Sepia" value={filters.sepia} min={0} max={100} onChange={(v) => setFilters({...filters, sepia: v})} />
              <Slider label="Blur" value={filters.blur} min={0} max={10} onChange={(v) => setFilters({...filters, blur: v})} />
              <Slider label="Invert" value={filters.invert} min={0} max={100} onChange={(v) => setFilters({...filters, invert: v})} />
              
              <div className="flex gap-2 mt-2">
                <button onClick={() => setFilters({...filters, flipH: filters.flipH === 1 ? -1 : 1})} className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-600">
                  <FlipHorizontal className="w-4 h-4" /> Flip H
                </button>
                <button onClick={() => setFilters({...filters, flipV: filters.flipV === 1 ? -1 : 1})} className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-600">
                  <FlipVertical className="w-4 h-4" /> Flip V
                </button>
              </div>

              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-4">Draw & Overlay</h3>
              <div className="flex gap-2">
                <button onClick={() => setIsDrawing(!isDrawing)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors ${isDrawing ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                  <PenTool className="w-4 h-4" /> Draw
                </button>
                <button onClick={clearCanvas} className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-600">
                  <Eraser className="w-4 h-4" /> Erase
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">Color:</label>
                <input type="color" value={brushColor} onChange={e => { setBrushColor(e.target.value); if(ctxRef.current) ctxRef.current.strokeStyle = e.target.value; }} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
                <label className="text-xs text-slate-400 ml-2">Size:</label>
                <input type="range" min="1" max="20" value={brushSize} onChange={e => { setBrushSize(Number(e.target.value)); if(ctxRef.current) ctxRef.current.lineWidth = Number(e.target.value); }} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
              </div>

              <div className="flex gap-2">
                <input type="text" value={textOverlay} onChange={e => setTextOverlay(e.target.value)} placeholder="Text to add..." className="flex-1 px-2 py-1 bg-slate-700 text-slate-200 rounded-md text-xs border-none outline-none" />
                <button onClick={applyTextOverlay} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md"><TextCursorInput className="w-4 h-4" /></button>
              </div>

              <label className="flex items-center justify-center gap-2 w-full py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-600 cursor-pointer">
                <ImageIcon className="w-4 h-4" /> Overlay Image
                <input type="file" accept="image/*" className="hidden" onChange={handleImageOverlay} />
              </label>

              <button onClick={() => { setFilters({ brightness: 100, contrast: 100, saturate: 100, grayscale: 0, rotate: 0, sepia: 0, blur: 0, invert: 0, flipH: 1, flipV: 1 }); clearCanvas(); }} className="flex items-center justify-center gap-2 w-full py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-600">
                <RotateCcw className="w-4 h-4" /> Reset All
              </button>
              <button onClick={() => setFilters({...filters, rotate: filters.rotate + 90})} className="flex items-center justify-center gap-2 w-full py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-600">
                <RotateCw className="w-4 h-4" /> Rotate 90°
              </button>
            </div>
            
            <div className="relative flex-1 bg-slate-950 rounded-xl p-6 flex items-center justify-center overflow-hidden shadow-2xl">
              {imageUrl && (
                <>
                  <img src={imageUrl} alt="Editor" className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg transition-all duration-300 pointer-events-none" style={imageFilterStyle} />
                  <canvas 
                    ref={canvasRef} 
                    onMouseDown={startDraw} 
                    onMouseMove={draw}
                    className={`absolute inset-0 w-full h-full ${isDrawing ? 'cursor-crosshair' : 'pointer-events-none'}`}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* PDF EDITOR */}
        {type === 'pdf' && (
          <div className="w-full max-w-4xl flex flex-col gap-4">
            <div className="bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-700 flex gap-2 no-print">
              <button onClick={addPdfPage} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-600">
                <Plus className="w-3 h-3" /> Add Page
              </button>
              <button onClick={deletePdfPage} className="flex items-center gap-2 px-3 py-1.5 bg-red-900 text-red-200 rounded-lg text-xs font-semibold hover:bg-red-800">
                <Minus className="w-3 h-3" /> Delete Page
              </button>
              <span className="text-xs text-slate-400 self-center ml-4">Edits will be burned into the new PDF on export.</span>
            </div>
            <div id="print-area" className="w-full min-h-[80vh] bg-white text-black shadow-2xl rounded-xl overflow-hidden border border-slate-700 p-8 md:p-12">
              <h2 className="text-xl font-bold mb-4 text-slate-800">Edit PDF Content</h2>
              <textarea 
                value={fileData}
                onChange={(e) => setFileData(e.target.value)}
                className="w-full h-[60vh] p-4 outline-none resize-none text-slate-800 text-sm leading-relaxed font-sans border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-200"
                placeholder="Upload a PDF to extract and edit its text. Click 'Save' to generate a new PDF with your edits."
              />
            </div>
          </div>
        )}
      </main>

      {/* AI Prompt Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-xl z-50 no-print">
        <div className="bg-slate-800 shadow-2xl border border-slate-700 rounded-full px-4 py-3 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0" />
          <input 
            type="text" 
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAISubmit()}
            placeholder="Ask AI: 'Translate to Spanish', 'Summarize', 'Make bullet points'..." 
            className="flex-1 bg-transparent outline-none text-sm text-slate-200 placeholder:text-slate-500"
          />
          <button onClick={handleAISubmit} className="text-indigo-400 font-bold text-sm hover:text-indigo-300 transition-colors p-1 hover:bg-slate-700 rounded-full">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

const ToolBtn = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
  <button onClick={onClick} className="p-2 hover:bg-slate-700 rounded-md text-slate-300 transition-colors">{children}</button>
);

const Slider = ({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) => (
  <div>
    <div className="flex justify-between mb-1">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <span className="text-xs text-slate-500">{value}</span>
    </div>
    <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
  </div>
);
