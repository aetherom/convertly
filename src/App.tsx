import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { ShieldCheck, AlertTriangle, X, Loader2 } from 'lucide-react';
import Home from './pages/Home';
import ToolsHub from './pages/ToolsHub';

// Lazy load heavy editor engines (Peak Performance)
const WordEditor = lazy(() => import('./pages/WordEditor'));
const ExcelEditor = lazy(() => import('./pages/ExcelEditor'));
const PdfEditor = lazy(() => import('./pages/PdfEditor'));
const ImageEditor = lazy(() => import('./pages/ImageEditor'));
const ToolRunner = lazy(() => import('./pages/ToolRunner'));
const DecryptGate = lazy(() => import('./pages/DecryptGate'));
const OpticalShare = lazy(() => import('./pages/OpticalShare'));

const ConsentGate = ({ children }: { children: React.ReactNode }) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const consent = localStorage.getItem('fileverse-consent');
    setHasAccess(consent === 'true');
  }, []);

  const handleAccept = () => {
    localStorage.setItem('fileverse-consent', 'true');
    setHasAccess(true);
  };

  const handleDeny = () => {
    setHasAccess(false);
    // @ts-ignore
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      // @ts-ignore
      window.Capacitor.App.exitApp();
    }
  };

  if (hasAccess === null) return null;

  if (!hasAccess) {
    return (
      <div className="fixed inset-0 bg-slate-950 text-white flex items-center justify-center p-6 z-50">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Legal Consent & Age Verification</h2>
            <p className="text-slate-400 text-sm mb-6">
              By using Fileverse, you confirm you are at least 16 years old. 
              All file processing and sharing happens locally on your device. We do not collect, store, or transmit your files or personal data.
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button onClick={handleAccept} className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
                <ShieldCheck className="w-5 h-5" /> I Accept & Continue
              </button>
              <button onClick={handleDeny} className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-lg font-semibold text-slate-300 flex items-center justify-center gap-2">
                <X className="w-5 h-5" /> Deny & Exit
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const LoadingFallback = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <ConsentGate>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tools" element={<ToolsHub />} />
            <Route path="/editor/word" element={<WordEditor />} />
            <Route path="/editor/excel" element={<ExcelEditor />} />
            <Route path="/editor/pdf" element={<PdfEditor />} />
            <Route path="/editor/image" element={<ImageEditor />} />
            <Route path="/tools/:toolId" element={<ToolRunner />} />
            <Route path="/decrypt" element={<DecryptGate />} />
            <Route path="/optical-share" element={<OpticalShare />} />
          </Routes>
        </Suspense>
      </ConsentGate>
    </BrowserRouter>
  );
}
