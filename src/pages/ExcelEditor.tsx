import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ExcelEditor() {
  const location = useLocation();
  const [data, setData] = useState<any[][]>([['No data loaded']]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!location.state || !location.state.file) {
      window.location.href = '/';
      return;
    }
    const file = location.state.file as File;
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
      setData(json as any[][]);
    };
    reader.readAsArrayBuffer(file);
  }, [location.state]);

  const handleExport = () => {
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'exported.xlsx');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 text-slate-400 hover:text-white">
          <ArrowLeft /> Back
        </button>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="overflow-auto rounded-lg border border-slate-800">
        <table className="min-w-full border-collapse">
          <tbody>
            {data.map((row, rIdx) => (
              <tr key={rIdx} className="border-b border-slate-800">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="border border-slate-800 px-3 py-2 text-sm text-slate-300 whitespace-nowrap">
                    {String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
