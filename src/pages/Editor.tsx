import { useParams } from 'react-router-dom';

export default function Editor() {
  const { type } = useParams<{ type: string }>();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center">
        <h1 className="font-bold text-lg capitalize">{type} Editor</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold">Download</button>
          <button className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold">Export As...</button>
        </div>
      </header>

      {/* Mobile Ad Space */}
      <div className="lg:hidden h-16 bg-slate-200 flex items-center justify-center text-xs text-slate-500">
        Ad Space (Keeps app free)
      </div>

      <main className="flex-1 p-4 flex justify-center">
        <div className="w-full max-w-5xl h-[80vh] bg-white shadow-lg rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center text-slate-400">
          Advanced {type} Editor Engine Loads Here...
        </div>
      </main>
    </div>
  );
}
