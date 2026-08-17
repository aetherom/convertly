import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet, Printer, ArrowLeft, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// @ts-ignore
declare let luckysheet: any;

export default function ExcelEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  const [fileName, setFileName] = useState('untitled');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const file = location.state?.file as File | undefined;
    if (file) handleFile(file);
    else initBlank();
  }, [location.state]);

  const initBlank = () => {
    if (typeof luckysheet !== 'undefined' && luckysheet.destroy) luckysheet.destroy();
    luckysheet.create({
      container: 'excel-container', lang: 'en', showinfobar: false, showtoolbar: true, showsheetbar: true,
      data: [{ name: "Sheet1", celldata: [{ r: 0, c: 0, v: { v: "Welcome to Fileverse" } }] }]
    });
  };

  // FIXED: Proper XLSX to Luckysheet Data Mapping
  const handleFile = (file: File) => {
    setFileName(file.name.split('.')[0]);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      
      const luckysheetData = workbook.SheetNames.map((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const celldata = [];
        
        json.forEach((row: any, r) => {
          row.forEach((val: any, c) => {
            if (val !== undefined && val !== null) {
              celldata.push({ r, c, v: { v: String(val), m: String(val), ct: { fa: "General", t: "g" } } });
            }
          });
        });
        return { name: sheetName, celldata };
      });

      if (typeof luckysheet !== 'undefined' && luckysheet.destroy) luckysheet.destroy();
      luckysheet.create({
        container: 'excel-container', lang: 'en', showinfobar: false, showtoolbar: true, showsheetbar: true,
        data: luckysheetData
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const triggerDownload = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = (format: string) => {
    // @ts-ignore
    const data = luckysheet.getSheetData(); 
    const aoa = data.map((row: any) => row.map((cell: any) => cell ? cell.v : ""));

    if (format === 'xlsx') {
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    } else if (format === 'csv') {
      const csv = aoa.map((row: any) => row.map((cell: any) => `"${cell || ''}"`).join(',')).join('\n');
      triggerDownload(new Blob([csv], { type: 'text/csv' }), `${fileName}.csv`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-700 flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex justify-between items-center sticky top-0 z-50 shadow-md no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-700 rounded-md text-slate-300"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex items-center gap-2"><div className="p-1.5 bg-green-600 rounded-lg"><FileSpreadsheet className="w-4 h-4 text-white" /></div><h1 className="font-bold text-slate-100">Fileverse Excel</h1></div>
        </div>
        <div className="flex gap-2 items-center">
          <input type="file" accept=".xlsx,.csv" ref={fileInputRef} onChange={e => e.target.files && handleFile(e.target.files[0])} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-300" title="Upload File"><Upload className="w-5 h-5" /></button>
          <button onClick={() => handleExport('csv')} className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-600 flex items-center gap-2"><Download className="w-4 h-4" /> CSV</button>
          <button onClick={() => handleExport('xlsx')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-500 flex items-center gap-2"><Download className="w-4 h-4" /> Save .xlsx</button>
        </div>
      </header>

      <main id="print-area" className="flex-1 p-4">
        <div className="w-full h-[85vh] bg-white shadow-2xl rounded-lg overflow-hidden border border-slate-900">
          <div id="excel-container" style={{ width: '100%', height: '100%' }}></div>
        </div>
      </main>
    </div>
  );
}
