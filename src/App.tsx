import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import Home from './pages/Home';
import { ToastProvider } from './components/Toaster';
import { ErrorBoundary } from './components/ErrorBoundary';

const ToolsHub = lazy(() => import('./pages/ToolsHub'));
const WordEditor = lazy(() => import('./pages/WordEditor'));
const ExcelEditor = lazy(() => import('./pages/ExcelEditor'));
const PdfEditor = lazy(() => import('./pages/PdfEditor'));
const ImageEditor = lazy(() => import('./pages/ImageEditor'));
const Settings = lazy(() => import('./pages/Settings'));
const ZipBuilder = lazy(() => import('./pages/tools/ZipBuilder'));
const PdfMerge = lazy(() => import('./pages/tools/PdfMerge'));
const PdfSplit = lazy(() => import('./pages/tools/PdfSplit'));
const ImgToPdf = lazy(() => import('./pages/tools/ImgToPdf'));
const PdfWatermark = lazy(() => import('./pages/tools/PdfWatermark'));
const SecureShare = lazy(() => import('./pages/SecureShare'));
const OpticalShare = lazy(() => import('./pages/OpticalShare'));

const ConsentGate = ({ children }: { children: React.ReactNode }) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    setHasAccess(localStorage.getItem('fileverse-consent') === 'true');
  }, []);

  if (hasAccess === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <ShieldCheck className="w-16 h-16 text-indigo-400 mb-4" />
        <h1 className="text-2xl font-bold mb-2 text-center">Legal Consent &amp; Age Verification</h1>
        <p className="text-slate-400 mb-6 text-center max-w-md">
          By using Fileverse you confirm you are at least 16 years old.<br />
          All processing happens locally on your device. Nothing is uploaded.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => { localStorage.setItem('fileverse-consent', 'true'); setHasAccess(true); }}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold"
          >
            I Accept &amp; Continue
          </button>
          <button onClick={() => setHasAccess(false)} className="px-6 py-3 bg-slate-800 rounded-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Denied
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const Loading = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <ConsentGate>
        <ToastProvider>
          <ErrorBoundary>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/tools" element={<ToolsHub />} />
                <Route path="/tools/zip" element={<ZipBuilder />} />
                <Route path="/tools/pdf-merge" element={<PdfMerge />} />
                <Route path="/tools/pdf-split" element={<PdfSplit />} />
                <Route path="/tools/img-to-pdf" element={<ImgToPdf />} />
                <Route path="/tools/pdf-watermark" element={<PdfWatermark />} />
                <Route path="/word-editor" element={<WordEditor />} />
                <Route path="/excel-editor" element={<ExcelEditor />} />
                <Route path="/pdf-editor" element={<PdfEditor />} />
                <Route path="/image-editor" element={<ImageEditor />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/secure-share" element={<SecureShare />} />
                <Route path="/decrypt" element={<SecureShare />} />
                <Route path="/optical-share" element={<OpticalShare />} />
                <Route path="*" element={<Home />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </ToastProvider>
      </ConsentGate>
    </BrowserRouter>
  );
}
