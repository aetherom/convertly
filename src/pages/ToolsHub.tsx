import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileArchive, Combine, SplitSquareHorizontal, Images, Stamp } from 'lucide-react';

const TOOLS = [
  { name: 'Merge PDFs', desc: 'Combine several PDFs into one, in your chosen order.', icon: <Combine />, color: 'bg-blue-500', route: '/tools/pdf-merge' },
  { name: 'Split PDF', desc: 'Pull out page ranges like "1-3,5" into new files.', icon: <SplitSquareHorizontal />, color: 'bg-rose-500', route: '/tools/pdf-split' },
  { name: 'Images → PDF', desc: 'Turn photos and graphics into a single PDF.', icon: <Images />, color: 'bg-purple-500', route: '/tools/img-to-pdf' },
  { name: 'Watermark PDF', desc: 'Stamp text across every page.', icon: <Stamp />, color: 'bg-teal-500', route: '/tools/pdf-watermark' },
  { name: 'Zip Builder', desc: 'Bundle any files into a downloadable .zip.', icon: <FileArchive />, color: 'bg-amber-500', route: '/tools/zip' },
];

export default function ToolsHub() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6">
          <ArrowLeft /> Back Home
        </button>
        <h1 className="text-2xl font-bold mb-8">Pro Tools</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOOLS.map((tool) => (
            <div
              key={tool.route}
              onClick={() => navigate(tool.route)}
              className="bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-indigo-500 cursor-pointer transition-all group"
            >
              <div className={`w-12 h-12 rounded-xl ${tool.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <div className="[&>svg]:w-6 [&>svg]:h-6 text-white">{tool.icon}</div>
              </div>
              <h3 className="text-lg font-bold mb-1">{tool.name}</h3>
              <p className="text-sm text-slate-400">{tool.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
