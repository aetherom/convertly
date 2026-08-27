import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud, FileText, Sheet, FileImage, FileType2, Shield, Camera,
  Wrench, Settings as SettingsIcon,
} from 'lucide-react';
import { useToast } from '../components/Toaster';

const ROUTES: Record<string, { route: string; label: string }> = {
  docx: { route: 'word-editor', label: 'Word' },
  doc: { route: 'word-editor', label: 'Word' },
  rtf: { route: 'word-editor', label: 'Word' },
  txt: { route: 'word-editor', label: 'Word' },
  md: { route: 'word-editor', label: 'Word' },
  xlsx: { route: 'excel-editor', label: 'Excel' },
  xls: { route: 'excel-editor', label: 'Excel' },
  csv: { route: 'excel-editor', label: 'Excel' },
  ods: { route: 'excel-editor', label: 'Excel' },
  pdf: { route: 'pdf-editor', label: 'PDF' },
  png: { route: 'image-editor', label: 'Image' },
  jpg: { route: 'image-editor', label: 'Image' },
  jpeg: { route: 'image-editor', label: 'Image' },
  webp: { route: 'image-editor', label: 'Image' },
  gif: { route: 'image-editor', label: 'Image' },
};

export default function Home() {
  const navigate = useNavigate();
  const toast = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const match = ROUTES[ext];
      if (match) {
        navigate(`/${match.route}`, { state: { file } });
      } else {
        toast(`Unsupported file type ".${ext}". Try Word, Excel, PDF or images.`, 'err');
      }
    },
    [navigate, toast]
  );

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
              <button
                onClick={() => navigate('/settings')}
                title="Settings"
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
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
          <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl mb-4">Drop Any File Here</h1>
          <p className="text-lg text-slate-600">
            Or click to browse. We detect the format and open the right editor. 100% local — nothing uploads.
          </p>
        </div>

        <div className="flex justify-center">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`relative w-full max-w-2xl border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-300 cursor-pointer ${
              isDragging
                ? 'border-indigo-600 bg-indigo-50 scale-105 shadow-xl shadow-indigo-100'
                : 'border-slate-300 bg-white hover:border-indigo-400 hover:shadow-lg'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => e.target.files && handleFile(e.target.files[0])}
            />
            <UploadCloud className={`mx-auto w-16 h-16 mb-4 ${isDragging ? 'text-indigo-600' : 'text-slate-400'}`} />
            <p className="text-lg font-semibold text-slate-700">
              {isDragging ? "Drop it like it's hot" : 'Drag & Drop your file here'}
            </p>
            <p className="text-sm text-slate-500 mt-2">Supports Word, Excel, CSV, PDF & Images</p>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <ToolCard icon={<FileText />} label="Word Editor" desc=".docx · rich text · export PDF" color="bg-blue-500" onClick={() => navigate('/word-editor')} />
          <ToolCard icon={<Sheet />} label="Excel Editor" desc="Editable grid with formulas" color="bg-green-500" onClick={() => navigate('/excel-editor')} />
          <ToolCard icon={<FileType2 />} label="PDF Editor" desc="View · organize pages · extract text" color="bg-red-500" onClick={() => navigate('/pdf-editor')} />
          <ToolCard icon={<FileImage />} label="Image Editor" desc="Filters · draw · overlays" color="bg-purple-500" onClick={() => navigate('/image-editor')} />
          <ToolCard icon={<Shield />} label="Secure Share" desc="Encrypted password links" color="bg-slate-800" onClick={() => navigate('/secure-share')} />
          <ToolCard icon={<Camera />} label="Optical Transfer" desc="Camera air-gapped sharing" color="bg-amber-500" onClick={() => navigate('/optical-share')} />
        </div>
      </div>
    </div>
  );
}

const ToolCard = ({ icon, label, desc, color, onClick }: { icon: React.ReactNode; label: string; desc: string; color: string; onClick: () => void }) => (
  <div onClick={onClick} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-200 cursor-pointer transition-all group">
    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
      <div className="[&>svg]:w-6 [&>svg]:h-6 text-white">{icon}</div>
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-1">{label}</h3>
    <p className="text-sm text-slate-500">{desc}</p>
    import { APP_VERSION } from '../version'; // ← add at top of file

// ...inside JSX, at the very bottom of the page:
<footer className="text-center text-xs text-slate-400 pb-8">
  Fileverse v{APP_VERSION} · 100% local processing ·{' '}
  <a href="/settings" className="underline hover:text-indigo-600">Settings</a> ·{' '}
  <a href="/?reset=1" className="underline hover:text-indigo-600">Reset app</a>
</footer>
  </div>
);
