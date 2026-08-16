import { useParams } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const WordEditor = lazy(() => import('../components/editors/WordEditor'));
const ExcelEditor = lazy(() => import('../components/editors/ExcelEditor'));
const PdfEditor = lazy(() => import('../components/editors/PdfEditor'));
const ImageEditor = lazy(() => import('../components/editors/ImageEditor'));

export default function Editor() {
  const { type } = useParams<{ type: string }>();

  const renderEditor = () => {
    switch (type) {
      case 'word': return <WordEditor />;
      case 'excel': return <ExcelEditor />;
      case 'pdf': return <PdfEditor />;
      case 'image': return <ImageEditor />;
      default: return <div>Unknown Editor</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center">
        <h1 className="font-bold text-lg capitalize">{type} Editor</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold">Download</button>
          <button className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold">Export As...</button>
        </div>
      </header>
      <div className="lg:hidden h-16 bg-slate-200 flex items-center justify-center text-xs text-slate-500">Ad Space</div>
      <main className="flex-1 p-4 flex justify-center">
        <Suspense fallback={<div className="flex items-center gap-2 text-slate-500"><Loader2 className="animate-spin" /> Loading Engine...</div>}>
          <div className="w-full max-w-5xl h-[80vh] bg-white shadow-lg rounded-xl overflow-hidden border border-slate-200">
            {renderEditor()}
          </div>
        </Suspense>
      </main>
    </div>
  );
}
