import { useState } from 'react';
import { Shield, X, Copy, Check } from 'lucide-react';

export default function ShareModal({ data, onClose }: { data: string; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const enc = new TextEncoder();

  const deriveKey = async (password: string, salt: Uint8Array) => {
    const keyMaterial = await window.crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
    return window.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  };

  const handleShare = async () => {
    setError('');
    if (!password) return setError('Please enter a password.');
    if (!data) return setError('No data to share. Type something first!');

    try {
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(password, salt);
      
      const ciphertext = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(data)
      );

      const saltB64 = btoa(String.fromCharCode(...salt));
      const ivB64 = btoa(String.fromCharCode(...iv));
      const cipherB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));

      const url = `${window.location.origin}/decrypt#enc=${saltB64}:${ivB64}:${cipherB64}`;
      setLink(url);
    } catch (err) {
      setError('Encryption failed. File might be too large.');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <div className="flex items-center gap-2 text-indigo-600">
            <Shield className="w-5 h-5" />
            <h2 className="font-bold text-slate-800">Secure Share</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-md"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500">Encrypt your current work with a password. Anyone with the link must enter this password to view it.</p>
          
          {link ? (
            <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-500 mb-2">Secure Link Generated:</p>
              <div className="flex items-center gap-2">
                <input type="text" value={link} readOnly className="flex-1 p-2 bg-white border border-slate-300 text-indigo-600 text-xs outline-none rounded-md" />
                <button onClick={copyLink} className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter a strong password" className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
              <button onClick={handleShare} className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-500">Encrypt & Generate Link</button>
            </div>
          )}
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </div>
      </div>
    </div>
  );
}
