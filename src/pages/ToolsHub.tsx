import { useNavigate } from 'react-router-dom';
import { Archive, ArrowLeft, Film, BookOpen, Eraser, ZoomIn } from 'lucide-react';

export default function ToolsHub() {
  const navigate = useNavigate();

  const tools = [
    { id: 'zip', name: 'Zip Builder', desc: 'Compress files client-side', icon: <Archive />, color: 'bg-amber-500' },
    { id: 'video', name: 'Video to GIF', desc: 'Convert video clips to GIF', icon: <Film />, color: 'bg-red-500' },
    { id: 'ebook', name: 'EPUB Builder', desc: 'Turn text into an eBook', icon: <BookOpen />, color: 'bg-blue-500' },
    { id: 'upscale', name: 'AI Upscaler', desc: '2x Image Resolution', icon: <ZoomIn />, color: 'bg-purple-500' },
    { id: 'shredder', name: 'File Shredder', desc: 'Securely wipe memory', icon: <Eraser />, color: 'bg-slate-800' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 py-4 px-6 flex items-center gap-4 sticky top-0 z-50 backdrop-blur-md bg-white/80">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Premium Tools Hub</h1>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mt-8">
          {tools.map(tool => (
            <button key={tool.id} onClick={() => navigate(`/tools/${tool.id}`)} className="group bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-start gap-4 transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl hover:border-transparent text-left">
              <div className={`p-3 ${tool.color} bg-opacity-10 group-hover:bg-opacity-100 rounded-xl transition-all duration-300`}>
                <span className={`[&>svg]:w-6 [&>svg]:h-6 ${tool.color.replace('bg-', 'text-')} group-hover:text-white transition-colors duration-300`}>{tool.icon}</span>
              </div>
              <div>
                <span className="block text-base font-bold text-slate-800">{tool.name}</span>
                <span className="block text-xs text-slate-400 mt-1">{tool.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
