import { useParams, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Download, ArrowLeft, FileText, FileType2, FileImage, Sheet } from 'lucide-react';

export default function Editor() {
  const { type } = useParams<{ type: string }>();
  const location = useLocation();
  const [fileContent, setFileContent] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('untitled');
  const exportRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    // Retrieve the file passed from the Home page drag & drop
    const file = location.state?.file as File | undefined;
    
    if (file) {
      setFileName(file.name.split('.')[0]);
      if (type === 'image') {
        const url = URL.createObjectURL(file);
        setImageUrl(url);
      } else {
        // Read text/doc content as text (basic implementation)
        const reader = new FileReader();
        reader.onload = (e) => setFileContent(e.target?.result as string);
        reader.readAsText(file);
      }
    } else {
      // Default content if opened via button without file
      setFileContent(`Start typing your ${type} document here...`);
    }
  }, [location.state, type]);

  const handleDownload = () => {
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.txt`; // Basic download as txt
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const format = exportRef.current?.value;
    if (format === 'pdf') {
      window.print(); // Triggers browser's native Save as PDF
    } else if (format === 'txt') {
      handleDownload();
    } else if (format === 'png' && type === 'image') {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = `${fileName}.png`;
      a.click();
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'word': return <FileText className="w-5 h-5" />;
      case 'excel': return <Sheet className="w-5 h-5" />;
      case 'pdf': return <FileType2 className="w-5 h-5" />;
      case 'image': return <FileImage className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2 text-indigo-600">
            {getIcon()}
            <h1 className="font-bold text-lg capitalize hidden sm:block">{type} Editor</h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 items-center">
          <select 
            ref={exportRef} 
            className="hidden md:block px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="txt">Export as TXT</option>
            <option value="pdf">Export as PDF</option>
            {type === 'image' && <option value="png">Export as PNG</option>}
          </select>
          
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export
          </button>

          <button 
            onClick={handleDownload}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md shadow-indigo-200"
          >
            <Download className="w-4 h-4" /> Save
          </button>
        </div>
      </header>

      {/* Mobile Ad Space */}
      <div className="lg:hidden h-16 bg-slate-200 flex items-center justify-center text-xs text-slate-500 border-b border-slate-300">
        Ad Space (Keeps app free)
      </div>

      {/* Main Editable Area */}
      <main className="flex-1 p-4 md:p-8 flex justify-center overflow-auto">
        <div className="w-full max-w-4xl h-[80vh] bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-200 transition-all duration-300 hover:shadow-xl">
          {type === 'image' && imageUrl ? (
            <div className="w-full h-full flex flex-col bg-slate-900">
              <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                <img src={imageUrl} alt="Editor" className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
              </div>
              <div className="bg-slate-800 p-4 flex justify-center gap-4">
                <button className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600">Crop</button>
                <button className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600">Rotate</button>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500">Apply Filters</button>
              </div>
            </div>
          ) : (
            <textarea 
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              className="w-full h-full p-8 md:p-12 outline-none resize-none text-slate-800 text-lg leading-relaxed font-sans"
              placeholder="Start editing..."
            />
          )}
        </div>
      </main>

      {/* AI Command Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-xl">
        <div className="bg-white shadow-2xl border border-slate-200 rounded-full px-4 py-3 flex items-center gap-3 hover:shadow-indigo-100 transition-shadow">
          <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <input 
            type="text" 
            placeholder="Ask AI to edit, summarize, or format..." 
            className="flex-1 outline-none text-sm text-slate-700 bg-transparent"
          />
          <button className="text-indigo-600 font-bold text-sm hover:text-indigo-800 transition-colors px-3 py-1 hover:bg-indigo-50 rounded-full">
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

// Need to import Sparkles at top because I used it at bottom
import { Sparkles } from 'lucide-react';
