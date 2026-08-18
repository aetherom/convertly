import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Loader2, CheckCircle } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const [isClearing, setIsClearing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      // 1. Unregister all Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
      }
      
      // 2. Delete all Cache Storage
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        for (let key of cacheKeys) {
          await caches.delete(key);
        }
      }
      
      // 3. Clear Local Storage (resets consent, etc.)
      localStorage.clear();
      
      // 4. Clear Cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      setIsDone(true);
      
      // 5. Force hard reload after 1.5 seconds
      setTimeout(() => {
        window.location.href = '/'; // Go home and reload
      }, 1500);

    } catch (err) {
      console.error("Failed to clear cache:", err);
      alert("Could not clear cache automatically. Please press Ctrl+Shift+R to hard refresh.");
      setIsClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
              <ArrowLeft /> Back
            </button>
            <span className="font-bold text-xl text-slate-900">Settings</span>
            <div className="w-8"></div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-2">App Maintenance</h2>
          <p className="text-slate-500 mb-6 text-sm">
            If the app is acting broken, not updating, or files aren't loading, click the button below. This will clear the browser cache, delete old background workers, and reset the app to a fresh state.
          </p>
          
          <button 
            onClick={handleClearCache} 
            disabled={isClearing || isDone}
            className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors text-white ${
              isDone ? 'bg-green-500' : 'bg-red-500 hover:bg-red-600'
            } disabled:opacity-70`}
          >
            {isClearing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Clearing Cache...
              </>
            ) : isDone ? (
              <>
                <CheckCircle className="w-5 h-5" /> Cache Cleared! Reloading...
              </>
            ) : (
              <>
                <Trash2 className="w-5 h-5" /> Clear Cache & Reset App
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
