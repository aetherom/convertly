import { useCallback, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, Sheet, FileImage, FileType2, Sparkles } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let route = 'unknown';
    
    if (['doc', 'docx', 'rtf', 'txt'].includes(ext)) route = 'word';
    else if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) route = 'excel';
    else if (ext === 'pdf') route = 'pdf';
    else if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) route = 'image';

    if (route !== 'unknown') {
      // Pass the actual file object to the editor route via React Router state
      navigate(`/editor/${route}`, { state: { file } });
    } else {
      alert('Unsupported file type. Try Word, Excel, PDF, or Image files.');
    }
  }, [navigate]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleButtonClick = (route: string) => {
    navigate(`/editor/${route}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 py-4 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {/* Modern SVG Logo */}
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Fileverse</h1>
        </div>
        <button className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
          <Sparkles className="w-4 h-4" /> AI Tools
        </button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-6 gap-8">
        
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          
          {/* Universal Drop Zone */}
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative w-full max-w-2xl border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-500 cursor-pointer overflow-hidden group
              ${isDragging ? 'border-indigo-600 bg-indigo-50 scale-105 shadow-xl shadow-indigo-100' : 'border-slate-300 bg-white hover:border-indigo-400 hover:shadow-lg'}`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={(e) => e.target.files && handleFile(e.target.files[0])} 
            />
            <div className="flex justify-center mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-2">
              <div className={`p-6 rounded-full transition-colors duration-500 ${isDragging ? 'bg-indigo-600' : 'bg-indigo-100 group-hover:bg-indigo-200'}`}>
                <UploadCloud className={`w-12 h-12 transition-colors duration-500 ${isDragging ? 'text-white' : 'text-indigo-600'}`} />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Drop Any File Here</h2>
            <p className="text-slate-500 mb-2 max-w-md mx-auto">We'll automatically detect the format and open the right advanced editor instantly.</p>
            <p className="text-xs text-slate-400 mt-4">Supports: Word, Excel, PDF, Images • 100% Private</p>
          </div>

          {/* Tool Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-12 w-full max-w-2xl">
            <ToolCard icon={<FileText />} label="Word Editor" color="bg-blue-500" onClick={() => handleButtonClick('word')} />
            <ToolCard icon={<Sheet />} label="Excel Editor" color="bg-green-500" onClick={() => handleButtonClick('excel')} />
            <ToolCard icon={<FileType2 />} label="PDF Editor" color="bg-red-500" onClick={() => handleButtonClick('pdf')} />
            <ToolCard icon={<FileImage />} label="Image Editor" color="bg-purple-500" onClick={() => handleButtonClick('image')} />
          </div>
        </div>

        {/* Ad Space */}
        <aside className="w-full lg:w-72 bg-white border border-slate-200 rounded-2xl p-6 hidden lg:flex flex-col shadow-sm">
          <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 rounded-xl border-dashed border border-slate-200 p-6">
            <span className="text-xs font-semibold tracking-wider uppercase mb-2">Sponsored</span>
            <p className="text-sm">Ad Space</p>
            <p className="text-xs mt-2 text-slate-300">Keeps the app free. No tracking.</p>
          </div>
        </aside>
      </main>
    </div>
  );
}

// Modern Tool Card Component
const ToolCard = ({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="group bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center gap-4 transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl hover:border-transparent"
  >
    <div className={`p-4 ${color} bg-opacity-10 group-hover:bg-opacity-100 rounded-2xl transition-all duration-300`}>
      <span className={`[&>svg]:w-7 [&>svg]:h-7 ${color.replace('bg-', 'text-')} group-hover:text-white transition-colors duration-300`}>{icon}</span>
    </div>
    <span className="text-sm font-semibold text-slate-700">{label}</span>
  </button>
);
