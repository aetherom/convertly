import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Mic, Square, Play, Copy, Check } from 'lucide-react';

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
        {toolId === 'voice' && <VoiceTool />}
        {toolId === 'format' && <FormatTool />}
        {toolId === 'hash' && <HashTool />}
        {toolId === 'idphoto' && <IDPhotoTool />}
        {toolId === 'translate' && <TranslateTool />}
      </main>
    </div>
  );
}

// --- 1. REGEX TOOL ---
function RegexTool() {
  const [text, setText] = useState('Hello 123 World 456');
  const [pattern, setPattern] = useState('\\d+');
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

// --- 2. QR TOOL ---
function QRTool() {
  const [text, setText] = useState('https://fileverse.app\nhttps://github.com');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generate = () => {
    const lines = text.split('\n').filter(l => l.trim());
    const canvas = canvasRef.current;
    if (!canvas || !QRCode) return;
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
      <div className="flex justify-center"><canvas ref={canvasRef}></canvas></div>
    </div>
  );
}

// --- 3. COLOR TOOL ---
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

// --- 4. SIGNATURE TOOL ---
function SignatureTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    canvas.width = canvas.offsetWidth; canvas.height = 200;
    ctx.lineWidth = 3; ctx.strokeStyle = '#0f172a'; ctx.lineCap = 'round';
  }, []);

  const startDraw = (e: React.MouseEvent) => { isDrawing.current = true; const ctx = canvasRef.current?.getContext('2d'); if (ctx) ctx.beginPath(); };
  const draw = (e: React.MouseEvent) => { if (!isDrawing.current) return; const ctx = canvasRef.current?.getContext('2d'); if (ctx) { ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); ctx.stroke(); } };
  const endDraw = () => { isDrawing.current = false; };
  const clear = () => { const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return; ctx.clearRect(0, 0, canvas.width, canvas.height); };
  const download = () => { const canvas = canvasRef.current; if (!canvas) return; const link = document.createElement('a'); link.download = 'signature.png'; link.href = canvas.toDataURL('image/png'); link.click(); };

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

// --- 5. ZIP TOOL ---
function ZipTool() {
  const [files, setFiles] = useState<File[]>([]);

  const handleFiles = (newFiles: FileList) => setFiles(prev => [...prev, ...Array.from(newFiles)]);
  const buildZip = async () => {
    if (!JSZip) return alert('Zip engine not loaded.');
    const zip = new JSZip();
    files.forEach(file => zip.file(file.name, file));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'fileverse-archive.zip'; a.click();
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

// --- 6. VOICE & TTS TOOL ---
function VoiceTool() {
  const [text, setText] = useState('Type or dictate your text here...');
  const [isRecording, setIsRecording] = useState(false);
  // @ts-ignore
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // @ts-ignore
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e: any) => {
        let interim = '';
        let final = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript;
          else interim += e.results[i][0].transcript;
        }
        setText(final + interim);
      };
      setRecognition(rec);
    }
  }, []);

  const toggleRecording = () => {
    if (!recognition) return alert('Voice recognition not supported in this browser.');
    if (isRecording) { recognition.stop(); setIsRecording(false); }
    else { recognition.start(); setIsRecording(true); }
  };

  const speak = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Text / Dictation Output</label>
        <textarea value={text} onChange={e => setText(e.target.value)} className="w-full h-32 p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-pink-500" />
      </div>
      <div className="flex gap-4">
        <button onClick={toggleRecording} className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-white ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-pink-500 hover:bg-pink-600'}`}>
          {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />} {isRecording ? 'Stop' : 'Record'}
        </button>
        <button onClick={speak} className="px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 flex items-center gap-2">
          <Play className="w-4 h-4" /> Speak Text
        </button>
      </div>
    </div>
  );
}

// --- 7. CODE FORMATTER TOOL ---
function FormatTool() {
  const [input, setInput] = useState('{"name":"fileverse","version":1}');
  const [output, setOutput] = useState('');
  const [lang, setLang] = useState('json');
  const [copied, setCopied] = useState(false);

  const format = () => {
    try {
      if (lang === 'json') {
        setOutput(JSON.stringify(JSON.parse(input), null, 2));
      } else if (lang === 'html') {
        setOutput(input.replace(/>\s+</g, '><').trim()); // Basic minify for demo
      } else {
        setOutput(input);
      }
    } catch (e) {
      setOutput('Error: Invalid ' + lang.toUpperCase());
    }
  };

  const copy = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <select value={lang} onChange={e => setLang(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500">
          <option value="json">JSON</option>
          <option value="html">HTML</option>
        </select>
        <button onClick={format} className="px-4 py-2 bg-cyan-500 text-white rounded-lg font-semibold hover:bg-cyan-400">Format / Minify</button>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Input</label>
        <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-32 p-3 border border-slate-300 rounded-lg outline-none font-mono text-sm" />
      </div>
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-bold text-slate-700">Output</label>
          <button onClick={copy} className="text-cyan-600 text-sm flex items-center gap-1">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Copy</button>
        </div>
        <pre className="w-full h-32 p-3 bg-slate-900 text-green-400 rounded-lg font-mono text-sm overflow-auto">{output}</pre>
      </div>
    </div>
  );
}

// --- 8. HASH GENERATOR TOOL ---
function HashTool() {
  const [hash, setHash] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    const hexArray = Array.from(new Uint8Array(digest));
    const hexHash = hexArray.map(b => b.toString(16).padStart(2, '0')).join('');
    setHash(hexHash);
  };

  return (
    <div className="space-y-6">
      <input type="file" ref={fileInputRef} onChange={e => e.target.files && handleFile(e.target.files[0])} className="hidden" />
      <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 flex items-center gap-2">
        <Download className="w-4 h-4" /> Select File for SHA-256
      </button>
      {hash && (
        <div className="bg-slate-900 p-4 rounded-lg break-all">
          <h3 className="text-sm font-bold text-slate-400 uppercase mb-2">SHA-256 Hash:</h3>
          <p className="text-green-400 font-mono text-sm">{hash}</p>
        </div>
      )}
    </div>
  );
}

// --- 9. ID PHOTO CROPPER ---
function IDPhotoTool() {
  const [imgUrl, setImgUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => setImgUrl(URL.createObjectURL(file));

  const cropToPassport = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const img = new Image(); img.src = imgUrl;
    img.onload = () => {
      canvas.width = 600; canvas.height = 600; // 2x2 inches at 300 DPI
      ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 600, 600);
      const size = Math.min(img.width, img.height);
      const offsetX = (img.width - size) / 2; const offsetY = (img.height - size) / 2;
      ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, 600, 600);
    };
  };

  const download = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const link = document.createElement('a'); link.download = 'id-photo.png'; link.href = canvas.toDataURL('image/png'); link.click();
  };

  return (
    <div className="space-y-6">
      <input type="file" accept="image/*" ref={fileInputRef} onChange={e => e.target.files && handleFile(e.target.files[0])} className="hidden" />
      <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-500">Upload Selfie</button>
      {imgUrl && (
        <>
          <button onClick={cropToPassport} className="px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700">Crop to Passport (2x2 in)</button>
          <div className="flex justify-center"><canvas ref={canvasRef} className="w-64 h-64 border-2 border-slate-300 rounded-lg shadow-md"></canvas></div>
          <button onClick={download} className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-500 flex items-center gap-2"><Download className="w-4 h-4" /> Download ID Photo</button>
        </>
      )}
    </div>
  );
}

// --- 10. UNIVERSAL TRANSLATOR ---
function TranslateTool() {
  const [text, setText] = useState('Hello, welcome to Fileverse.');
  const [translated, setTranslated] = useState('');
  const [targetLang, setTargetLang] = useState('es');

  const translate = async () => {
    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`);
      const data = await res.json();
      setTranslated(data.responseData.translatedText);
    } catch (e) {
      setTranslated('Translation service temporarily unavailable.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">English Text</label>
        <textarea value={text} onChange={e => setText(e.target.value)} className="w-full h-32 p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
      </div>
      <div className="flex gap-4 items-center">
        <select value={targetLang} onChange={e => setTargetLang(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg outline-none">
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="zh">Chinese</option>
          <option value="ja">Japanese</option>
          <option value="hi">Hindi</option>
        </select>
        <button onClick={translate} className="px-4 py-2 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-400">Translate</button>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Translation</label>
        <textarea value={translated} readOnly className="w-full h-32 p-3 bg-slate-50 border border-slate-300 rounded-lg outline-none" />
      </div>
    </div>
  );
}
