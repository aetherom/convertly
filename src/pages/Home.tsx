import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, Sheet, FileImage, FileType2 } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    
    let route = 'unknown';
    if (['doc', 'docx', 'rtf', 'txt'].includes(ext)) route = 'word';
    else if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) route = 'excel';
    else if (ext === 'pdf') route = 'pdf';
    else if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'psd'].includes(ext)) route = 'image';

    if (route !== 'unknown') {
      navigate(`/editor/${route}`);
    } else {
      alert('Unsupported file type.');
    }
  }, [navigate]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 py-4 px-6 flex items-center gap-2">
        <svg width="32" height="32" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="512" height="512" rx="128" fill="#4f46e5"/>
          <path d="M128 128 L256 128 L384 256 L256 384 L128 384 Z" fill="none" stroke="#ffffff" strokeWidth="24" strokeLinejoin="round"/>
          <circle cx="320" cy="192" r="32" fill="#ffffff"/>
        </svg>
        <h1 className="text-xl font-bold text-slate-900">Convertly</h1>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-6 gap-6">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`w-full max-w-2xl border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer ${isDragging ? 'border-indigo-600 bg-indigo-50 scale-105' : 'border-slate-300 bg-white hover:border-slate-400'}`}
          >
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-indigo-100 rounded-full">
                <UploadCloud className="w-12 h-12 text-indigo-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Drop Any File Here</h2>
            <p className="text-slate-500 mb-6">We'll automatically detect the format and open the right editor.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 w-full max-w-2xl">
            <button onClick={() => navigate('/editor/word')} className="flex flex-col items-center gap-2 bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-500 transition-all">
              <FileText className="w-8 h-8 text-indigo-600" /> <span className="text-sm font-medium">Word Editor</span>
            </button>
            <button onClick={() => navigate('/editor/excel')} className="flex flex-col items-center gap-2 bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-500 transition-all">
              <Sheet className="w-8 h-8 text-indigo-600" /> <span className="text-sm font-medium">Excel Editor</span>
            </button>
            <button onClick={() => navigate('/editor/pdf')} className="flex flex-col items-center gap-2 bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-500 transition-all">
              <FileType2 className="w-8 h-8 text-indigo-600" /> <span className="text-sm font-medium">PDF Editor</span>
            </button>
            <button onClick={() => navigate('/editor/image')} className="flex flex-col items-center gap-2 bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-500 transition-all">
              <FileImage className="w-8 h-8 text-indigo-600" /> <span className="text-sm font-medium">Image Editor</span>
            </button>
          </div>
        </div>
        <aside className="w-full lg:w-64 bg-slate-100 border border-slate-200 rounded-xl p-4 hidden lg:flex flex-col">
          <div className="flex-1 flex items-center justify-center text-center text-slate-400 text-sm border-dashed border border-slate-300 rounded-lg p-4">
            Ad Space<br/>Keeps the app free.<br/>No tracking.
          </div>
        </aside>
      </main>
    </div>
  );
}
