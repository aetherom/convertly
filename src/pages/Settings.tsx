import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '../components/Toaster';

export default function Settings() {
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState<'idle' | 'clearing' | 'done'>('idle');

  const handleClearCache = async () => {
    setBusy('clearing');
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) await reg.unregister();
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) await caches.delete(key);
      }
      localStorage.removeItem('fileverse-consent');
      setBusy('done');
      setTimeout(() => (window.location.href = '/'), 1500);
    } catch {
      toast('Could not clear everything automatically. Try Ctrl+Shift+R.', 'err');
      setBusy('idle');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 flex items-center h-16">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft /> Back
          </button>
          <span className="font-bold text-lg mx-auto pr-12">Settings</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Reset App</h2>
          <p className="text-slate-500 mb-6 text-sm">
            Clears browser caches and stored service workers, and resets the consent screen. Useful if the app behaves strangely after an update.
          </p>
          <button
            onClick={handleClearCache}
            disabled={busy !== 'idle'}
            className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors text-white ${
              busy === 'done' ? 'bg-emerald-500' : 'bg-red-500 hover:bg-red-600'
            } disabled:opacity-70`}
          >
            {busy === 'clearing' ? (<><Loader2 className="w-5 h-5 animate-spin" /> Clearing…</>)
              : busy === 'done' ? (<><CheckCircle className="w-5 h-5" /> Done! Reloading…</>)
              : (<><Trash2 className="w-5 h-5" /> Clear Cache &amp; Reset</>)}
          </button>
        </div>
      </div>
    </div>
  );
}
