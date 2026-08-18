import { useCallback, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, Sheet, FileImage, FileType2, Shield, Camera, Wrench, Settings as SettingsIcon } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let route = 'unknown';
    
    if (['doc', 'docx', 'rtf', 'txt'].includes(ext)) route = 'word-editor';
    else if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) route = 'excel-editor';
    else if (ext === 'pdf') route = 'pdf-editor';
    else if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) route = 'image-editor';

    if (route !== 'unknown') {
      navigate(`/${route}`, { state: { file } });
    } else {
      alert('Unsupported file type. Try Word, Excel, PDF, or Image files.');
    }
  }, [navigate]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleButtonClick = (route: string) => {
    navigate(`/${route}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <FileType2 className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-900">Fileverse</span>
            </div>
            <div className="flex items-center gap-2">
              {/* New Settings Button */}
              <button 
                onClick={() => navigate('/settings')} 
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="App Settings & Cache Reset"
              >
                <SettingsIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={() => navigate('/tools')} 
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Wrench className="w-4 h-4" /> Pro Tools
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl mb-4">
            Drop Any File Here
          </h1>
          <p className="text-lg text-slate-600">
            Or click to browse. We'll automatically detect the format and open the advanced editor.
          </p>
        </div>

        <div className="flex justify-center">
          <div
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative w-full max-w-2xl border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-300 cursor-pointer overflow-hidden group
              ${isDragging ? 'border-indigo-600 bg-indigo-50 scale-105 shadow-xl shadow-indigo-100' : 'border-slate-300 bg-white hover:border-indigo-400 hover:shadow-lg'}`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={(e) => e.target.files && handleFile(e.target.files[0])} 
            />
            <UploadCloud className={`mx-auto w-16 h-16 mb-4 transition-colors ${isDragging ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'}`} />
            <p className="text-lg font-semibold text-slate-700">
              {isDragging ? 'Drop it like it\'s hot' : 'Drag & Drop your file here'}
            </p>
            <p className="text-sm text-slate-500 mt-2">Supports Word, Excel, PDF, Images & more</p>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <ToolCard icon={<FileText />} label="Word Editor" desc="Documents & Rich Text" color="bg-blue-500" onClick={() => handleButtonClick('word-editor')} />
          <ToolCard icon={<Sheet />} label="Excel Editor" desc="Spreadsheets & Grids" color="bg-green-500" onClick={() => handleButtonClick('excel-editor')} />
          <ToolCard icon={<FileType2 />} label="PDF Editor" desc="View & Annotate" color="bg-red-500" onClick={() => handleButtonClick('pdf-editor')} />
          <ToolCard icon={<FileImage />} label="Image Editor" desc="Photos & Graphics" color="bg-purple-500" onClick={() => handleButtonClick('image-editor')} />
          <ToolCard icon={<Shield />} label="Secure Share" desc="Encrypt & Generate Link" color="bg-slate-800" onClick={() => handleButtonClick('decrypt')} />
          <ToolCard icon={<Camera />} label="Optical Transfer" desc="Camera Air-Gapped Share" color="bg-amber-500" onClick={() => handleButtonClick('optical-share')} />
        </div>
      </div>
    </div>
  );
}

const ToolCard = ({ icon, label, desc, color, onClick }: { icon: React.ReactNode; label: string; desc: string; color: string; onClick: () => void }) => (
  <div 
    onClick={onClick} 
    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-200 cursor-pointer transition-all group"
  >
    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
      <div className={`[&>svg]:w-6 [&>svg]:h-6 text-white`}>{icon}</div>
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-1">{label}</h3>
    <p className="text-sm text-slate-500">{desc}</p>
  </div>
);
