import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Upload, Trash2, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveBlob } from '../lib/save';
import { useToast } from '../components/Toaster';

/* ---------- helpers ---------- */
const colName = (n: number): string => {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
};
const colIndex = (s: string): number => {
  let n = 0;
  for (const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
};
const cellKey = (r: number, c: number) => `${r}:${c}`;
const refKey = (ref: string) => {
  const m = /^([A-Z]+)(\d+)$/.exec(ref.toUpperCase());
  return m ? cellKey(parseInt(m[2], 10), colIndex(m[1])) : null;
};

const NUMERIC = /^-?\d+(\.\d+)?$/;
function parseScalar(raw: string): number | string | null {
  const t = raw.trim();
  if (t === '') return null;
  if (NUMERIC.test(t)) return parseFloat(t);
  return t;
}

type Val = number | string | null;

/* Evaluate every formula in the sheet, with cycle/reference protection. */
function computeSheet(cells: Map<string, string>, rows: number, cols: number) {
  const cache = new Map<string, Val>();
  const visiting = new Set<string>();

  const rangeValues = (a: string, b: string, getVal: (r: number, c: number) => Val): number[] => {
    const ma = /^([A-Z]+)(\d+)$/.exec(a.toUpperCase());
    const mb = /^([A-Z]+)(\d+)$/.exec(b.toUpperCase());
    if (!ma || !mb) return [];
    const c1 = Math.min(colIndex(ma[1]), colIndex(mb[1]));
    const c2 = Math.max(colIndex(ma[1]), colIndex(mb[1]));
    const r1 = Math.min(+ma[2], +mb[2]);
    const r2 = Math.max(+ma[2], +mb[2]);
    const out: number[] = [];
    for (let r = r1; r <= r2; r++)
      for (let c = c1; c <= c2; c++) {
        if (r > rows || c > cols) continue;
        const v = getVal(r, c);
        if (typeof v === 'number' && Number.isFinite(v)) out.push(v);
      }
    return out;
  };

  const getValue = (r: number, c: number, depth = 0): Val => {
    if (depth > 128) return '#DEPTH';
    if (r < 1 || c < 1 || r > rows || c > cols) return '#REF!';
    const key = cellKey(r, c);
    if (cache.has(key)) return cache.get(key)!;
    if (visiting.has(key)) return '#CYC';
    const raw = (cells.get(key) ?? '').trim();

    let v: Val = null;
    if (raw !== '') {
      if (!raw.startsWith('=')) {
        v = parseScalar(raw);
      } else {
        visiting.add(key);
        try { v = evalExpression(raw.slice(1), (rr, cc) => getValue(rr, cc, depth + 1)); }
        catch { v = '#ERR'; }
        finally { visiting.delete(key); }
      }
    }
    cache.set(key, v);
    return v;
  };

  function evalExpression(expr: string, getVal: (r: number, c: number) => Val): Val {
    let bad = false;
    let e = expr.trim();

    // function ranges: SUM / AVERAGE / MIN / MAX / COUNT
    const fnRe = /\b(SUM|AVERAGE|AVG|MIN|MAX|COUNT)\(\s*([A-Za-z]+\d+)\s*:\s*([A-Za-z]+\d+)\s*\)/gi;
    e = e.replace(fnRe, (_m, fn, a, b) => {
      const vals = rangeValues(a, b, getVal);
      const sum = vals.reduce((s, x) => s + x, 0);
      switch (fn.toUpperCase()) {
        case 'SUM': return String(vals.length ? round(sum) : 0);
        case 'AVERAGE':
        case 'AVG': return vals.length ? String(round(sum / vals.length)) : (bad = true, '');
        case 'MIN': return vals.length ? String(round(Math.min(...vals))) : (bad = true, '');
        case 'MAX': return vals.length ? String(round(Math.max(...vals))) : (bad = true, '');
        case 'COUNT': return String(vals.length);
        default: return (bad = true, '');
      }
    });
    if (bad) return '#DIV/0!';

    // bare cell references
    e = e.replace(/\b[A-Za-z]+\d+\b/g, (ref) => {
      const parts = /^([A-Za-z]+)(\d+)$/.exec(ref);
      if (!parts) return '0';
      const v = getVal(parseInt(parts[2], 10), colIndex(parts[1]));
      if (typeof v === 'number' && Number.isFinite(v)) return String(v);
      if (v === null) return '0';
      bad = true;
      return '0';
    });
    if (bad) return '#VALUE!';

    // percentages, caret power
    e = e.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)').replace(/\^/g, '**');

    // whitelist remaining characters before evaluating
    if (!/^[\d\s.+\-*/()]*(?:\*\*)?$/.test(e.replace(/\*\*/g, ''))) return '#NAME?';

    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${e});`)();
      if (typeof result === 'number' && Number.isFinite(result)) return round(result);
      return '#ERR';
    } catch {
      return '#ERR';
    }
  }

  const grid: Val[][] = [];
  for (let r = 1; r <= rows; r++) {
    const rowVals: Val[] = [];
    for (let c = 1; c <= cols; c++) rowVals.push(getValue(r, c));
    grid.push(rowVals);
  }
  return grid;
}

const round = (n: number) => Math.round(n * 1e10) / 1e10;

const fmt = (v: Val): string => {
  if (v === null) return '';
  if (typeof v === 'number') return String(v);
  return v;
};

/* ---------- component ---------- */
const INIT_ROWS = 40;
const INIT_COLS = 16;

export default function ExcelEditor() {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('untitled');
  const [cells, setCells] = useState<Map<string, string>>(new Map());
  const [rows, setRows] = useState(INIT_ROWS);
  const [cols, setCols] = useState(INIT_COLS);
  const [focused, setFocused] = useState<string | null>(null);
  const [selInfo, setSelInfo] = useState<{ r: number; c: number } | null>(null);

  const grid = useMemo(() => computeSheet(cells, rows, cols), [cells, rows, cols]);

  const getRaw = useCallback((r: number, c: number) => cells.get(cellKey(r, c)) ?? '', [cells]);
  const setRaw = useCallback((r: number, c: number, v: string) => {
    setCells((prev) => {
      const next = new Map(prev);
      const k = cellKey(r, c);
      if (v === '') next.delete(k); else next.set(k, v);
      return next;
    });
  }, []);

  const navigateKey = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const below = document.querySelector<HTMLInputElement>(`[data-cell="${cellKey(Math.min(rows, r + 1)},${c})"]`);
      below?.focus();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const dir = e.shiftKey ? -1 : 1;
      const nc = Math.max(1, Math.min(cols, c + dir));
      document.querySelector<HTMLInputElement>(`[data-cell="${cellKey(r)}"` ) ;
      document.querySelector<HTMLInputElement>(`[data-cell="${cellKey(r, nc)}"]`)?.focus();
    }
  };

  const importWorkbook = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
        const map = new Map<string, string>();
        let maxR = 0, maxC = 0;
        aoa.forEach((row, ri) =>
          (row as any[]).forEach((v, ci) => {
            if (v !== '' && v != null) {
              map.set(cellKey(ri + 1, ci + 1), typeof v === 'object' ? JSON.stringify(v) : String(v));
              maxR = Math.max(maxR, ri + 1);
              maxC = Math.max(maxC, ci + 1);
            }
          })
        );
        setCells(map);
        setRows(Math.max(INIT_ROWS, maxR + 8));
        setCols(Math.max(INIT_COLS, maxC + 4));
        setFileName(file.name.replace(/\.[^.]+$/, ''));
        toast(`Loaded "${file.name}" — ${maxR}×${maxC}`, 'ok');
      } catch {
        toast('Could not parse that spreadsheet.', 'err');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const exportXlsx = () => {
    const aoa: any[][] = [];
    for (let r = 1; r <= rows; r++) {
      const row: any[] = [];
      for (let c = 1; c <= cols; c++) {
        const v = grid[r - 1][c - 1];
        row.push(typeof v === 'number' ? v : v == null ? '' : v.startsWith('#') ? '' : v);
      }
      aoa.push(row);
    }
    // trim fully-empty trailing rows/cols
    while (aoa.length && aoa[aoa.length - 1].every((v) => v === '')) aoa.pop();
    const usedCols = Math.max(1, ...aoa.map((r) => { let last = 0; r.forEach((v, i) => { if (v !== '') last = i + 1; }); return last; }));
    const trimmed = aoa.map((r) => r.slice(0, usedCols));
    const ws = XLSX.utils.aoa_to_sheet(trimmed);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `${fileName || 'untitled'}.xlsx`);
  };

  const exportCsv = () => {
    const lines: string[] = [];
    for (let r = 1; r <= rows; r++) {
      const row: string[] = [];
      let lastUsed = -1;
      for (let c = 1; c <= cols; c++) {
        const s = fmt(grid[r - 1][c - 1]);
        row.push(s);
        if (s !== '') lastUsed = c;
      }
      if (lastUsed >= 0) {
        const trimmed = row.slice(0, lastUsed);
        lines.push(trimmed.map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(','));
      }
    }
    saveBlob(new Blob([lines.join('\n')], { type: 'text/csv' }), `${fileName || 'untitled'}.csv`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap gap-2 justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-white">
            <ArrowLeft /> Back
          </button>
          <input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="px-2 py-1 text-sm font-semibold bg-transparent border border-transparent hover:border-slate-700 focus:border-indigo-500 rounded outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { if (confirm('Clear the whole sheet?')) { setCells(new Map()); toast('Sheet cleared.'); } }}
            className="px-3 py-2 text-sm bg-slate-800 rounded-lg hover:bg-slate-700 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Clear
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="px-3 py-2 text-sm bg-slate-800 rounded-lg hover:bg-slate-700 flex items-center gap-2">
            <Upload className="w-4 h-4" /> Open
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.ods" className="hidden" onChange={(e) => importWorkbook(e.target.files?.[0])} />
          <select
            defaultValue=""
            onChange={(e) => { const v = e.target.value; e.currentTarget.selectedIndex = 0; if (v === 'xlsx') exportXlsx(); else if (v === 'csv') exportCsv(); }}
            className="px-3 py-2 text-sm bg-slate-800 rounded-lg outline-none"
          >
            <option value="" disabled>Export…</option>
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="csv">CSV (.csv)</option>
          </select>
          <button onClick={exportXlsx} className="px-4 py-2 text-sm font-semibold bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-2">
            <Download className="w-4 h-4" /> Save
          </button>
        </div>
      </header>

      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center gap-3 text-sm">
        <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-slate-500 font-mono text-xs w-12 shrink-0">{selInfo ? colName(selInfo.c) + selInfo.r : ''}</span>
        <input
          className="flex-1 bg-slate-800 rounded px-3 py-1.5 outline-none font-mono text-xs focus:ring-1 ring-indigo-500"
          placeholder={focused ? null : "Select a cell, or type a formula like =SUM(A1:A5)*B2"}
          value={focused ? getRaw(selInfo!.r, selInfo!.c) : ''}
          onChange={(e) => selInfo && setRaw(selInfo.r, selInfo.c, e.target.value)}
          onFocus={() => setFocused(selInfo?.key ?? null)}
          onBlur={() => setFocused(null)}
          readOnly={!selInfo}
        />
        <span className="hidden md:block text-[11px] text-slate-500 whitespace-nowrap">Formulas: =A1+B2 · =SUM(A1:A9) · =AVERAGE · =MIN · =MAX · =COUNT · 25%</span>
      </div>

      <div className="overflow-auto p-0" style={{ height: 'calc(100vh - 118px)' }}>
        <table className="border-collapse bg-white" style={{ minWidth: '100%' }}>
          <thead>
            <tr>
              <th className="xl-corner border border-slate-200 w-12 min-w-[48px]" />
              {Array.from({ length: cols }, (_, i) => (
                <th key={i} className="xl-head xl-rowhead border border-slate-200 w-32 min-w-[128px]" style={{ left: 48 }}>
                  {colName(i + 1)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, ri) => (
              <tr key={ri}>
                <td className="xl-rowhead border border-slate-200 text-center" style={{ position: 'sticky', left: 0 }}>{ri + 1}</td>
                {Array.from({ length: cols }, (_, ci) => {
                  const r = ri + 1, c = ci + 1;
                  const key = cellKey(r, c);
                  const raw = getRaw(r, c);
                  const computed = grid[ri][ci];
                  const isFocused = focused === key;
                  return (
                    <td key={ci} className="border border-slate-200 p-0 w-32 max-w-[128px]">
                      <input
                        data-cell={key}
                        data-r={r}
                        data-c={c}
                        className={`xl-input ${computed != null && typeof computed === 'string' && computed.startsWith('#') ? 'text-red-600 font-semibold' : ''}`}
                        value={isFocused ? raw : fmt(computed)}
                        placeholder=""
                        onChange={(e) => setRaw(r, c, e.target.value)}
                        onFocus={() => { setFocused(key); setSelInfo({ r, c } as any); }}
                        onBlur={() => setFocused(null)}
                        onKeyDown={(e) => navigateKey(e, r, c)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
