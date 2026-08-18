import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import Home from './pages/Home';
import ToolsHub from './pages/ToolsHub';
import Settings from './pages/Settings'; // <-- Added Settings Import
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load heavy editor engines
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <ShieldCheck className="w-16 h-16 text-indigo-400 mb-4" />
        <h1 className="text-2xl font-bold mb-2 text-center">Legal Consent & Age Verification</h1>
        <p className="text-slate-400 mb-6 text-center max-w-md">
          By using Fileverse, you confirm you are at least 16 years old. <br />
          All file processing and sharing happens locally on your device. We do not collect, store, or transmit your files or personal data.
        </p>
        <div className="flex gap-4">
          <button onClick={handleAccept} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold flex items-center gap-2">
            <ShieldCheck /> I Accept & Continue
          </button>
          <button onClick={handleDeny} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-semibold flex items-center gap-2">
            <AlertTriangle /> Deny & Exit
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const LoadingFallback = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <ConsentGate>
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/tools" element={<ToolsHub />} />
              <Route path="/settings" element={<Settings />} /> {/* <-- Added Route */}
              <Route path="/word-editor" element={<WordEditor />} />
              <Route path="/excel-editor" element={<ExcelEditor />} />
              <Route path="/pdf-editor" element={<PdfEditor />} />
              <Route path="/image-editor" element={<ImageEditor />} />
              <Route path="/tool-runner" element={<ToolRunner />} />
              <Route path="/decrypt" element={<DecryptGate />} />
              <Route path="/optical-share" element={<OpticalShare />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </ConsentGate>
    </BrowserRouter>
  );
}
