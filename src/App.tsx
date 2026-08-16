import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, X } from 'lucide-react';
import Home from './pages/Home';
import Editor from './pages/Editor';

const ConsentGate = ({ children }: { children: React.ReactNode }) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const consent = localStorage.getItem('convertly-consent');
    setHasAccess(consent === 'true');
  }, []);

  const handleAccept = () => {
    localStorage.setItem('convertly-consent', 'true');
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
              By using Convertly, you confirm you are at least 16 years old. 
              All file processing happens locally on your device. We do not collect, store, or transmit your files or personal data.
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

export default function App() {
  return (
    <BrowserRouter>
      <ConsentGate>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/editor/:type" element={<Editor />} />
        </Routes>
      </ConsentGate>
    </BrowserRouter>
  );
}
