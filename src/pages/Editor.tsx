import { useParams, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { 
  Download, ArrowLeft, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  List, Plus, Minus, RotateCw, FileType2, FileText, Sheet, FileImage, Sparkles 
} from 'lucide-react';

export default function Editor() {
  const { type } = useParams<{ type: string }>();
  const location = useLocation();
  const [fileName, setFileName] = useState<string>('untitled');
  
  // Word States
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Excel States
  const [gridData, setGridData] = useState<string[][]>([...Array(20)].map(() => Array(8).fill('')));
  
  // Image States
  const [imageUrl, setImageUrl] = useState<string>('');
  const [filters, setFilters] = useState({ brightness: 100, contrast: 100, saturate: 100, grayscale: 0, rotate: 0 });

  useEffect(() => {
    const file = location.state?.file as File | undefined;
    if (file) {
      setFileName(file.name.split('.')[0]);
      if (type === 'image') {
        setImageUrl(URL.createObjectURL(file));
      } else if (type === 'word' || type === 'pdf') {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (editorRef.current) editorRef.current.innerHTML = e.target?.result as string || `<p>Start editing your document...</p>`;
        };
        reader.readAsText(file);
      }
    } else {
      if (editorRef.current && type === 'word') editorRef.current.innerHTML = `<p>Start editing your document...</p>`;
    }
  }, [location.state, type]);

  // --- LOGIC HANDLERS ---

  // Word Formatting (execCommand is still the standard for contentEditable rich text)
  const execCmd = (cmd: string, val?: string) => document.execCommand(cmd, false, val);

  // Add/Remove Excel Rows/Cols
  const addRow = () => setGridData([...gridData, Array(gridData[0].length).fill('')]);
  const addCol = () => setGridData(gridData.map(row => [...row, '']));
  
  const handleCellChange = (r: number, c: number, val: string) => {
    const newData = [...gridData];
    newData[r][c] = val;
    setGridData(newData);
  };

  // Dynamic Export Logic
  const handleExport = (format: string) => {
    if (type === 'word') {
      if (format === 'pdf') window.print();
      else if (format === 'txt') {
        const blob = new Blob([editorRef.current?.innerText || ''], { type: 'text/plain' });
        triggerDownload(blob, `${fileName}.txt`);
      } else if (format === 'html') {
        const blob = new Blob([editorRef.current?.innerHTML || ''], { type: 'text/html' });
        triggerDownload(blob, `${fileName}.html`);
      }
    } else if (type === 'excel') {
      if (format === 'csv') {
        const csv = gridData.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
        triggerDownload(new Blob([csv], { type: 'text/csv' }), `${fileName}.csv`);
      } else if (format === 'pdf') window.print();
    } else if (type === 'image') {
      if (format === 'png' || format === 'jpg') {
        // Basic Image Export: just downloads the original file (Canvas processing requires heavy libs, this is a lightweight fallback)
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = `${fileName}.${format}`;
        a.click();
      }
    } else if (type === 'pdf') {
      window.print();
    }
  };

  const triggerDownload = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- RENDER UI ---

  const getExportOptions = () => {
    if (type === 'word') return ['pdf', 'txt', 'html'];
    if (type === 'excel') return ['csv', 'pdf'];
    if (type === 'image') return ['png', 'jpg'];
    if (type === 'pdf') return ['pdf'];
    return ['txt'];
  };

  const getIcon = () => {
    switch (type) {
      case 'word': return <FileText className="w-5 h-5" />;
      case 'excel': return <Sheet className="w-5 h-5" />;
      case 'pdf': return <FileType2 className="w-5 h-5" />;
      case 'image': return <FileImage className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2 text-indigo-600">
            {getIcon()}
            <h1 className="font-bold text-lg capitalize hidden sm:block">{type} Editor</h1>
          </div>
        </div>

        {/* Dynamic Export & Save */}
        <div className="flex gap-2 items-center">
          <select 
            onChange={(e) => handleExport(e.target.value)}
            className="hidden md:block px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            defaultValue=""
          >
            <option value="" disabled>Export as...</option>
            {getExportOptions().map(fmt => <option key={fmt} value={fmt}>Export as {fmt.toUpperCase()}</option>)}
          </select>
          
          <button 
            onClick={() => handleExport(getExportOptions()[0])}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md shadow-indigo-200"
          >
            <Download className="w-4 h-4" /> Save
          </button>
        </div>
      </header>

      {/* Mobile Ad Space */}
      <div className="lg:hidden h-16 bg-slate-200 flex items-center justify-center text-xs text-slate-500 border-b border-slate-300">
        Ad Space (Keeps app free)
      </div>

      {/* Editor Main Area */}
      <main className="flex-1 p-4 md:p-8 flex justify-center overflow-auto">
        
        {/* 1. WORD EDITOR */}
        {type === 'word' && (
          <div className="w-full max-w-4xl flex flex-col gap-4">
            {/* Formatting Toolbar */}
            <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex gap-1 flex-wrap sticky top-20 z-40">
              <ToolBtn onClick={() => execCmd('bold')}><Bold className="w-4 h-4" /></ToolBtn>
              <ToolBtn onClick={() => execCmd('italic')}><Italic className="w-4 h-4" /></ToolBtn>
              <ToolBtn onClick={() => execCmd('underline')}><Underline className="w-4 h-4" /></ToolBtn>
              <div className="w-px h-6 bg-slate-200 mx-1"></div>
              <ToolBtn onClick={() => execCmd('justifyLeft')}><AlignLeft className="w-4 h-4" /></ToolBtn>
              <ToolBtn onClick={() => execCmd('justifyCenter')}><AlignCenter className="w-4 h-4" /></ToolBtn>
              <ToolBtn onClick={() => execCmd('justifyRight')}><AlignRight className="w-4 h-4" /></ToolBtn>
              <div className="w-px h-6 bg-slate-200 mx-1"></div>
              <ToolBtn onClick={() => execCmd('insertUnorderedList')}><List className="w-4 h-4" /></ToolBtn>
              <select onChange={(e) => execCmd('formatBlock', e.target.value)} className="px-2 py-1 bg-slate-100 rounded-md text-xs font-medium border-none outline-none">
                <option value="p">Paragraph</option>
                <option value="h1">Title 1</option>
                <option value="h2">Title 2</option>
                <option value="h3">Title 3</option>
              </select>
            </div>
            {/* Page-like Canvas */}
            <div 
              ref={editorRef}
              contentEditable
              className="w-full min-h-[80vh] bg-white shadow-2xl rounded-xl p-8 md:p-12 outline-none text-slate-800 text-lg leading-relaxed font-sans focus:ring-4 focus:ring-indigo-100 transition-all"
            ></div>
          </div>
        )}

        {/* 2. EXCEL EDITOR */}
        {type === 'excel' && (
          <div className="w-full max-w-5xl flex flex-col gap-4">
            {/* Sheet Toolbar */}
            <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex gap-2 sticky top-20 z-40">
              <button onClick={addRow} className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100"><Plus className="w-3 h-3" /> Row</button>
              <button onClick={addCol} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100"><Plus className="w-3 h-3" /> Column</button>
            </div>
            {/* Grid */}
            <div className="w-full bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-200 overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody>
                  {gridData.map((row, r) => (
                    <tr key={r} className="border-b border-slate-100">
                      <td className="bg-slate-50 text-xs text-slate-400 p-2 border-r border-slate-100 text-center w-12 select-none">{r + 1}</td>
                      {row.map((cell, c) => (
                        <td key={c} className="border-r border-slate-100 p-0">
                          <input 
                            type="text" 
                            value={cell} 
                            onChange={(e) => handleCellChange(r, c, e.target.value)} 
                            className="w-full h-10 px-3 outline-none focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-200 text-sm text-slate-800"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. IMAGE EDITOR */}
        {type === 'image' && (
          <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-6">
            {/* Filters Panel */}
            <div className="w-full lg:w-64 bg-white shadow-sm rounded-xl p-4 border border-slate-200 flex flex-col gap-4 h-fit sticky top-20">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Adjust</h3>
              <Slider label="Brightness" value={filters.brightness} min={0} max={200} onChange={(v) => setFilters({...filters, brightness: v})} />
              <Slider label="Contrast" value={filters.contrast} min={0} max={200} onChange={(v) => setFilters({...filters, contrast: v})} />
              <Slider label="Saturate" value={filters.saturate} min={0} max={200} onChange={(v) => setFilters({...filters, saturate: v})} />
              <Slider label="Grayscale" value={filters.grayscale} min={0} max={100} onChange={(v) => setFilters({...filters, grayscale: v})} />
              <button onClick={() => setFilters({...filters, rotate: filters.rotate + 90})} className="flex items-center justify-center gap-2 w-full py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors mt-2">
                <RotateCw className="w-4 h-4" /> Rotate 90°
              </button>
            </div>
            {/* Image Canvas */}
            <div className="flex-1 bg-slate-900 rounded-xl p-6 flex items-center justify-center overflow-hidden shadow-2xl">
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt="Editor" 
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg transition-all duration-300"
                  style={{ 
                    filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) grayscale(${filters.grayscale}%)`,
                    transform: `rotate(${filters.rotate}deg)`
                  }}
                />
              ) : (
                <div className="text-slate-500">No image loaded</div>
              )}
            </div>
          </div>
        )}

        {/* 4. PDF EDITOR */}
        {type === 'pdf' && (
          <div className="w-full max-w-4xl bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-200 min-h-[80vh] flex flex-col items-center justify-center p-10 text-center">
            <FileType2 className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">PDF Viewer & Annotator</h2>
            <p className="text-slate-500 max-w-md mb-6">Upload a PDF file from the home page to view it here. You can export it or print it to a new PDF using the button above.</p>
            <button onClick={() => window.print()} className="px-6 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors">
              Print / Save as PDF
            </button>
          </div>
        )}

      </main>

      {/* AI Command Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-xl z-50">
        <div className="bg-white shadow-2xl border border-slate-200 rounded-full px-4 py-3 flex items-center gap-3 hover:shadow-indigo-100 transition-shadow">
          <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <input 
            type="text" 
            placeholder="Ask AI to edit, summarize, or format..." 
            className="flex-1 outline-none text-sm text-slate-700 bg-transparent"
          />
          <button className="text-indigo-600 font-bold text-sm hover:text-indigo-800 transition-colors px-3 py-1 hover:bg-indigo-50 rounded-full">
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper Components
const ToolBtn = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
  <button onClick={onClick} className="p-2 hover:bg-slate-100 rounded-md text-slate-600 transition-colors">{children}</button>
);

const Slider = ({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) => (
  <div>
    <div className="flex justify-between mb-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <span className="text-xs text-slate-400">{value}%</span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      value={value} 
      onChange={(e) => onChange(Number(e.target.value))} 
      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
    />
  </div>
);
