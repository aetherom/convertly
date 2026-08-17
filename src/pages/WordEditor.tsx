import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import Image from '@tiptap/extension-image';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, 
  List, Type, Highlighter, Undo, Redo, Maximize, Minimize, Sparkles, Send, 
  Code, Quote, ArrowLeft, Upload, Download, Share2, Mic, PenTool, X
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import ShareModal from '../components/ShareModal';

// @ts-ignore
declare let mammoth: any;

export default function WordEditor() {
  const navigate = useNavigate();
  const { isZenMode, toggleZenMode } = useEditorStore();
  const [aiPrompt, setAiPrompt] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  // @ts-ignore
  const [recognition, setRecognition] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [ StarterKit, Underline, TextAlign.configure({ types: ['heading', 'paragraph'] }), TextStyle, Color, Highlight, FontFamily, Image ],
    content: '<p>Start creating your masterpiece...</p>',
  });

  useEffect(() => {
    const interval = setInterval(() => { if (editor) { try { localStorage.setItem('fv-word-autosave', editor.getHTML()); } catch {} } }, 5000);
    return () => clearInterval(interval);
  }, [editor]);

  // Voice Dictation Setup
  useEffect(() => {
    // @ts-ignore
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      const rec = new SpeechRec(); rec.continuous = true; rec.interimResults = true;
      rec.onresult = (e: any) => {
        let final = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript;
        }
        editor?.chain().focus().insertContent(final).run();
      };
      setRecognition(rec);
    }
  }, [editor]);

  const toggleRecording = () => {
    if (!recognition) return alert('Voice recognition not supported.');
    if (isRecording) { recognition.stop(); setIsRecording(false); }
    else { recognition.start(); setIsRecording(true); }
  };

  // FIXED: Robust File Upload using Mammoth for .docx
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      editor?.commands.setContent(result.value || '<p></p>');
    } else {
      // Fallback for .txt
      const reader = new FileReader();
      reader.onload = (ev) => { editor?.commands.setContent(`<p>${ev.target?.result as string}</p>`); };
      reader.readAsText(file);
    }
  };

  const handleAISubmit = () => {
    if (!editor || !aiPrompt) return;
    const selectedText = editor.state.selection.content().content.firstChild?.textContent || editor.getText();
    if (!selectedText) return alert("Highlight some text first!");
    let result = `(${aiPrompt}): ${selectedText}`; 
    editor.chain().focus().insertContent(`<p>${result}</p>`).run();
    setAiPrompt('');
  };

  // FIXED: Reliable Export Logic
  const handleExport = (format: string) => {
    if (!editor) return;
    if (format === 'pdf') {
      window.print(); // Uses CSS @media print
    } else {
      const content = format === 'txt' ? editor.getText() : editor.getHTML();
      const blob = new Blob([content], { type: format === 'txt' ? 'text/plain' : 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `document.${format}`; a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (isZenMode) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-center justify-center p-8">
        <button onClick={toggleZenMode} className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"><Minimize className="w-6 h-6" /></button>
        <div id="print-area" className="w-full max-w-3xl min-h-[80vh] bg-white text-black shadow-2xl rounded-lg p-12 outline-none text-lg leading-relaxed font-sans"><EditorContent editor={editor} /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 flex flex-col">
      <header className="bg-white border-b border-slate-300 sticky top-0 z-50 shadow-sm no-print">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-md text-slate-600"><ArrowLeft className="w-5 h-5" /></button>
            <div className="flex items-center gap-2"><div className="p-1.5 bg-indigo-600 rounded-lg"><Type className="w-4 h-4 text-white" /></div><h1 className="font-bold text-slate-800 hidden sm:block">Fileverse Word</h1></div>
          </div>
          <div className="flex gap-2 items-center">
            <input type="file" accept=".txt,.docx" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-slate-100 rounded-md text-slate-600" title="Upload File"><Upload className="w-5 h-5" /></button>
            <button onClick={() => setShowSignature(true)} className="p-2 hover:bg-slate-100 rounded-md text-slate-600" title="Insert Signature"><PenTool className="w-5 h-5" /></button>
            <button onClick={toggleRecording} className={`p-2 rounded-md ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-slate-600 hover:bg-slate-100'}`} title="Voice Dictation"><Mic className="w-5 h-5" /></button>
            <button onClick={() => setShowShare(true)} className="p-2 hover:bg-slate-100 rounded-md text-indigo-600" title="Secure Share"><Share2 className="w-5 h-5" /></button>
            <button onClick={toggleZenMode} className="p-2 hover:bg-slate-100 rounded-md text-slate-600" title="Zen Mode"><Maximize className="w-5 h-5" /></button>
            <select onChange={e => handleExport(e.target.value)} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs border-none outline-none" defaultValue="">
              <option value="" disabled>Export</option><option value="pdf">PDF</option><option value="txt">TXT</option><option value="html">HTML</option>
            </select>
          </div>
        </div>
        <div className="flex gap-1 flex-wrap p-2 items-center">
          <ToolBtn onClick={() => editor?.chain().focus().undo().run()}><Undo className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => editor?.chain().focus().redo().run()}><Redo className="w-4 h-4" /></ToolBtn>
          <div className="w-px h-6 bg-slate-300 mx-1"></div>
          <select onChange={e => editor?.chain().focus().setFontFamily(e.target.value).run()} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs border-none outline-none">
            <option value="Arial">Arial</option><option value="Times New Roman">Times New Roman</option><option value="Courier New">Courier New</option>
          </select>
          <select onChange={e => editor?.chain().focus().setFontSize(e.target.value).run()} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs border-none outline-none">
            <option value="12px">12</option><option value="14px">14</option><option value="16px">16</option><option value="24px">24</option>
          </select>
          <div className="w-px h-6 bg-slate-300 mx-1"></div>
          <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => editor?.chain().focus().toggleUnderline().run()}><UnderlineIcon className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => editor?.chain().focus().toggleHighlight().run()}><Highlighter className="w-4 h-4" /></ToolBtn>
          <input type="color" onChange={e => editor?.chain().focus().setColor(e.target.value).run()} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
          <div className="w-px h-6 bg-slate-300 mx-1"></div>
          <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('left').run()}><AlignLeft className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('center').run()}><AlignCenter className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('right').run()}><AlignRight className="w-4 h-4" /></ToolBtn>
        </div>
      </header>

      <main className="flex-1 py-8 overflow-auto">
        <div id="print-area" className="w-[8.5in] min-h-[11in] bg-white shadow-2xl mx-auto p-[1in] outline-none text-slate-800 text-lg leading-relaxed font-sans">
          <EditorContent editor={editor} />
        </div>
      </main>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-xl z-50 no-print">
        <div className="bg-white shadow-2xl border border-slate-200 rounded-full px-4 py-3 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <input type="text" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAISubmit()} placeholder="Ask AI: 'Translate to Spanish', 'Make bullet points', 'Uppercase'..." className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400" />
          <button onClick={handleAISubmit} className="text-indigo-600 font-bold text-sm hover:text-indigo-800 transition-colors p-1 hover:bg-indigo-50 rounded-full"><Send className="w-4 h-4" /></button>
        </div>
      </div>

      {showShare && editor && ( <ShareModal data={editor.getHTML()} onClose={() => setShowShare(false)} /> )}
      {showSignature && editor && ( <SignatureModal editor={editor} onClose={() => setShowSignature(false)} /> )}
    </div>
  );
}

const ToolBtn = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
  <button onClick={onClick} className="p-2 hover:bg-slate-100 rounded-md text-slate-600 transition-colors">{children}</button>
);

function SignatureModal({ editor, onClose }: { editor: any; onClose: () => void }) {
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
  const insert = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    editor.chain().focus().setImage({ src: canvas.toDataURL('image/png') }).run();
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-800">Draw Signature</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-md"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white">
            <canvas ref={canvasRef} onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw} className="w-full h-[200px] cursor-crosshair"></canvas>
          </div>
          <button onClick={insert} className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-500">Insert into Document</button>
        </div>
      </div>
    </div>
  );
}
