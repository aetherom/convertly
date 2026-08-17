import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';

// @ts-ignore
declare let JSZip: any;
// @ts-ignore
declare let QRCode: any;

export default function ToolRunner() {
  const { toolId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 py-4 px-6 flex items-center gap-4 sticky top-0 z-50">
        <button onClick={() => navigate('/tools')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 capitalize">{toolId} Tool</h1>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full p-6">
        {toolId === 'regex' && <RegexTool />}
        {toolId === 'qr' && <QRTool />}
        {toolId === 'color' && <ColorTool />}
        {toolId === 'signature' && <SignatureTool />}
        {toolId === 'zip' && <ZipTool />}
      </main>
    </div>
  );
}

// 1. REGEX TOOL
function RegexTool() {
  const [text, setText] = useState('Hello 123 World 456');
  const [pattern, setPattern] =('\\d+');
  const [matches, setMatches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const regex = new RegExp(pattern, 'g');
      setMatches(text.match(regex) || []);
    } catch { setMatches([]); }
  }, [text, pattern]);

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Text Input</label>
        <textarea value={text} onChange={e => setText(e.target.value)} className="w-full h-32 p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Regex Pattern</label>
        <input value={pattern} onChange={e => setPattern(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
      </div>
      <div className="bg-slate-900 text-white p-4 rounded-lg">
        <h3 className="text-sm font-bold text-slate-400 uppercase mb-2">Matches ({matches.length})</h3>
        {matches.length > 0 ? <pre className="text-green-400 text-sm">{JSON.stringify(matches, null, 2)}</pre> : <p className="text-slate-500 text-sm">No matches found.</p>}
      </div>
    </div>
  );
}

// 2. QR TOOL
function QRTool() {
  const [text, setText] = useState('https://fileverse.app\nhttps://github.com');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generate = () => {
    const lines = text.split('\n').filter(l => l.trim());
    const canvas = canvasRef.current;
    if (!canvas || !QRCode) return;
    
    // Just generate the first one as a demo
    QRCode.toCanvas(canvas, lines[0] || 'Fileverse', { width: 300 }, (error: any) => {
      if (error) console.error(error);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Enter Data (One per line)</label>
        <textarea value={text} onChange={e => setText(e.target.value)} className="w-full h-32 p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>
      <button onClick={generate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-500">Generate QR</button>
      <div className="flex justify-center">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}

// 3. COLOR TOOL
function ColorTool() {
  const [colors, setColors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 100; canvas.height = 100;
      ctx?.drawImage(img, 0, 0, 100, 100);
      const data = ctx?.getImageData(0, 0, 100, 100).data;
      if (data) {
        const colorMap: Record<string, number> = {};
        for (let i = 0; i < data.length; i += 4) {
          const rgb = `${data[i]},${data[i+1]},${data[i+2]}`;
          colorMap[rgb] = (colorMap[rgb] || 0) + 1;
        }
        const sorted = Object.entries(colorMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(c => {
          const [r, g, b] = c[0].split(',').map(Number);
          return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        });
        setColors(sorted);
      }
    };
  };

  return (
    <div className="space-y-6">
      <input type="file" accept="image/*" ref={fileInputRef} onChange={e => e.target.files && handleFile(e.target.files[0])} className="hidden" />
      <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-500">Upload Image</button>
      <div className="grid grid-cols-5 gap-4">
        {colors.map(c => (
          <div key={c} className="flex flex-col items-center">
            <div className="w-full h-24 rounded-lg shadow-md" style={{ backgroundColor: c }}></div>
            <span className="text-xs font-mono mt-2 text-slate-600">{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. SIGNATURE TOOL
function SignatureTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0f172a';
    ctx.lineCap = 'round';
  }, []);

  const startDraw = (e: React.MouseEvent) => {
    isDrawing.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.beginPath();
  };
  const draw = (e: React.MouseEvent) => {
    if (!isDrawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      ctx.stroke();
    }
  };
  const endDraw = () => { isDrawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const download = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'signature.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white">
        <canvas ref={canvasRef} onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw} className="w-full h-[200px] cursor-crosshair"></canvas>
      </div>
      <div className="flex gap-4">
        <button onClick={clear} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300">Clear</button>
        <button onClick={download} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-500 flex items-center gap-2"><Download className="w-4 h-4" /> Download PNG</button>
      </div>
    </div>
  );
}

// 5. ZIP TOOL
function ZipTool() {
  const [files, setFiles] = useState<File[]>([]);

  const handleFiles = (newFiles: FileList) => {
    setFiles(prev => [...prev, ...Array.from(newFiles)]);
  };

  const buildZip = async () => {
    if (!JSZip) return alert('Zip engine not loaded.');
    const zip = new JSZip();
    files.forEach(file => zip.file(file.name, file));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'fileverse-archive.zip'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <input type="file" multiple onChange={e => e.target.files && handleFiles(e.target.files)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100" />
      <ul className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
        {files.map((f, i) => <li key={i} className="text-sm text-slate-700">{f.name}</li>)}
      </ul>
      {files.length > 0 && <button onClick={buildZip} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-500 flex items-center gap-2"><Download className="w-4 h-4" /> Build & Download Zip</button>}
    </div>
  );
}
