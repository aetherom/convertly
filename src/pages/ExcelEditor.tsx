import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Upload, Trash2, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveBlob } from '../lib/save';
import { useToast } from '../components/Toaster';

/* ---------- helpers ---------- */
const colName = (n: number): string => {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};
const colIndex = (s: string): number => {
  let n = 0;
  for (const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
};
const cellKey = (r: number, c: number) => `${r}:${c}`;
const NUMERIC = /^-?\d+(\.\d+)?$/;

type Val = number | string | null;

function parseScalar(raw: string): Val {
  const t = raw.trim();
  if (t === '') return null;
  if (NUMERIC.test(t)) return parseFloat(t);
  return t;
}

const round = (n: number) => Math.round(n * 1e10) / 1e10;

function evalExpression(
  expr: string,
  getVal: (r: number, c: number) => Val
): Val {
  const rangeValues = (aRef: string, bRef: string): number[] => {
    const ma = /^([A-Z]+)(\d+)$/.exec(aRef.toUpperCase());
    const mb = /^([A-Z]+)(\d+)$/.exec(bRef.toUpperCase());
    if (!ma || !mb) return [];
    const c1 = Math.min(colIndex(ma[1]), colIndex(mb[1]));
    const c2 = Math.max(colIndex(ma[1]), colIndex(mb[1]));
    const r1 = Math.min(parseInt(ma[2], 10), parseInt(mb[2], 10));
    const r2 = Math.max(parseInt(ma[2], 10), parseInt(mb[2], 10));
    const out: number[] = [];
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const v = getVal(r, c);
        if (typeof v === 'number' && Number.isFinite(v)) out.push(v);
      }
    }
    return out;
  };

  let bad: string | null = null;
  let e = expr.trim();

  // aggregate functions over ranges
  e = e.replace(
    /\b(SUM|AVERAGE|AVG|MIN|MAX|COUNT)\(\s*([A-Za-z]+\d+)\s*:\s*([A-Za-z]+\d+)\s*\)/gi,
    (_m, fn: string, a: string, b: string) => {
      const vals = rangeValues(a, b);
      const sum = vals.reduce((s, x) => s + x, 0);
      switch (fn.toUpperCase()) {
        case 'SUM': return String(vals.length ? round(sum) : 0);
        case 'AVERAGE':
        case 'AVG':
          if (!vals.length) bad = '#DIV/0!';
          return vals.length ? String(round(sum / vals.length)) : '';
        case 'MIN':
          if (!vals.length) bad = '#DIV/0!';
          return vals.length ? String(round(Math.min(...vals))) : '';
        case 'MAX':
          if (!vals.length) bad = '#DIV/0!';
          return vals.length ? String(round(Math.max(...vals))) : '';
        case 'COUNT': return String(vals.length);
        default:
          bad = '#NAME?';
          return '';
      }
    }
  );
  if (bad) return bad;

  // bare cell references
  e = e.replace(/\b[A-Za-z]+\d+\b/g, (ref) => {
    const parts = /^([A-Za-z]+)(\d+)$/.exec(ref);
    if (!parts) {
