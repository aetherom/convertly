import { useState, useEffect } from 'react';
import { Shield, Lock, Unlock, Copy, Check } from 'lucide-react';

export default function DecryptGate() {
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [inputText, setInputText] = useState('');
  const [password, setPassword] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [decryptedText, setDecryptedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#enc=')) {
      setMode('decrypt');
    }
  }, []);

  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const deriveKey = async (password: string, salt: Uint8Array) => {
    const keyMaterial = await window.crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
    return window.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
  };

  const handleEncrypt = async () => {
    setError('');
    if (!inputText || !password) return setError('Please enter text and a password.');
    try {
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(password, salt);
      
      const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(inputText));

      const saltB64 = btoa(String.fromCharCode(...salt));
      const ivB64 = btoa(String.fromCharCode(...iv));
      const cipherB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));

      const link = `${window.location.origin}/decrypt#enc=${saltB64}:${ivB64}:${cipherB64}`;
      setGeneratedLink(link);
    } catch (err) { setError('Encryption failed.'); }
  };

  const handleDecrypt = async () => {
    setError('');
    if (!password) return setError('Please enter the password.');
    try {
      const hash = window.location.hash.replace('#enc=', '');
      const parts = hash.split(':');
      if (parts.length !== 3) return setError('Corrupted link.');
      
      const [saltB64, ivB64, cipherB64] = parts;
      
      const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
      const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
      const ciphertext = Uint8Array.from(atob(cipherB64), c => c.charCodeAt(0));

      const key = await deriveKey(password, salt);
      
      const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
      setDecryptedText(dec.decode(decrypted));
    } catch (err) {
      setError('Decryption failed. Incorrect password or corrupted link.');
    }
  };

  const copyLink = () => { navigator.clipboard.writeText(generatedLink); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-xl bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
        <div className="flex border-b border-slate-700">
          <button onClick={() => setMode('encrypt')} className={`flex-1 py-4 font-semibold flex items-center justify-center gap-2 ${mode === 'encrypt' ? 'bg-slate-700 text-indigo-400' : 'text-slate-400'}`}><Lock className="w-4 h-4" /> Encrypt</button>
          <button onClick={() => setMode('decrypt')} className={`flex-1 py-4 font-semibold flex items-center justify-center gap-2 ${mode === 'decrypt' ? 'bg-slate-700 text-indigo-400' : 'text-slate-400'}`}><Unlock className="w-4 h-4" /> Decrypt</button>
        </div>
        <div className="p-8">
          {mode === 'encrypt' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Text to Encrypt</label>
                <textarea value={inputText} onChange={e => setInputText(e.target.value)} className="w-full h-32 p-3 bg-slate-900 text-slate-200 outline-none resize-none text-sm rounded-lg border border-slate-700 focus:ring-2 focus:ring-indigo-500" placeholder="Enter your secret text..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 bg-slate-900 text-slate-200 outline-none text-sm rounded-lg border border-slate-700 focus:ring-2 focus:ring-indigo-500" placeholder="Enter a strong password" />
              </div>
              <button onClick={handleEncrypt} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold flex items-center justify-center gap-2"><Shield className="w-5 h-5" /> Generate Secure Link</button>
              {generatedLink && (
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                  <p className="text-xs text-slate-400 mb-2">Share this link:</p>
                  <div className="flex items-center gap-2">
                    <input type="text" value={generatedLink} readOnly className="flex-1 p-2 bg-transparent text-indigo-400 text-xs outline-none" />
                    <button onClick={copyLink} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md">{copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-300" />}</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center text-slate-400 text-sm">{window.location.hash ? 'Encrypted payload detected in URL.' : 'No encrypted payload found. Open a secure link to decrypt.'}</div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Enter Password to Decrypt</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 bg-slate-900 text-slate-200 outline-none text-sm rounded-lg border border-slate-700 focus:ring-2 focus:ring-indigo-500" placeholder="Enter password" />
              </div>
              <button onClick={handleDecrypt} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold flex items-center justify-center gap-2"><Unlock className="w-5 h-5" /> Decrypt Data</button>
              {decryptedText && (
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                  <p className="text-xs text-slate-400 mb-2">Decrypted Content:</p>
                  <textarea value={decryptedText} readOnly className="w-full h-32 p-3 bg-transparent text-slate-200 text-sm outline-none resize-none" />
                </div>
              )}
            </div>
          )}
          {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}
        </div>
      </div>
    </div>
  );
}
