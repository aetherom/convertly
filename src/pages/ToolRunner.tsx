import { useState, useRef } from 'react';
import { ArrowLeft, Download, FileArchive } from 'lucide-react';
import JSZip from 'jszip';

export default function ToolRunner() {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const createZip = async () => {
    if (files.length === 0) return alert('Please select files first.');
    const zip = new JSZip();
    files.forEach(file => {
      zip.file(file.name, file);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'archive.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6">
        <ArrowLeft /> Back
      </button>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><FileArchive /> Zip Builder Tool</h1>

      <div className="max-w-2xl">
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors"
        >
          <FileArchive className="mx-auto w-12 h-12 text-slate-500 mb-4" />
          <p className="text-slate-400">{files.length > 0 ? `${files.length} files selected` : 'Click to select files'}</p>
          <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} />
        </div>

        {files.length > 0 && (
          <div className="mt-6 space-y-2">
            {files.map((file, idx) => (
              <div key={idx} className="bg-slate-900 p-3 rounded-lg flex justify-between items-center text-sm border border-slate-800">
                <span className="text-slate-300 truncate">{file.name}</span>
                <span className="text-slate-500 text-xs">{(file.size / 1024).toFixed(2)} KB</span>
              </div>
            ))}
          </div>
        )}

        <button 
          onClick={createZip} 
          disabled={files.length === 0}
          className="mt-6 w-full py-3 bg-indigo-600 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" /> Download ZIP
        </button>
      </div>
    </div>
  );
}
