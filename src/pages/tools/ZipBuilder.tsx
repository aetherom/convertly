import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import { ArrowLeft, Download, FileArchive } from 'lucide-react';
import { saveBlob } from '../../lib/save';
import { useToast } from '../../components/Toaster';

export default function ZipBuilder() {
  const navigate = useNavigate();
  const toast = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const build = async () => {
    if (!files.length) return toast('Select files first.', 'err');
    const zip = new JSZip();
    files.forEach((f) => zip.file(f.name, f));
    const blob = await zip.generateAsync({ type: 'blob' });
    await saveBlob(blob, 'archive.zip');
    toast(`Zipped ${files.length} files.`, 'ok');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <button onClick={() => navigate('/tools')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6"><ArrowLeft /> Back to Tools</button>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><FileArchive className="text-amber-400" /> Zip Builder</h1>

      <div className="max-w-2xl">
        <div onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors">
          <FileArchive className="mx-auto w-12 h-12 text-slate-500 mb-4" />
          <p className="text-slate-400">{files.length ? `${files.length} files selected` : 'Click to select files'}</p>
          <input type="file" multiple ref={inputRef} className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
        </div>

        {!!files.length && (
          <ul className="mt-6 space-y-2">
            {files.map((f, i) => (
              <li key={i} className="bg-slate-900 p-3 rounded-lg flex justify-between items-center text-sm border border-slate-800">
                <span className="truncate">{f.name}</span>
                <span className="text-slate-500 text-xs ml-4 shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
              </li>
            ))}
          </ul>
        )}

        <button onClick={build} disabled={!files.length}
          className="mt-6 w-full py-3 bg-indigo-600 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> Download ZIP
        </button>
      </div>
    </div>
  );
}
