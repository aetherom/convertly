import { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Lock, Unlock, Copy, Check } from 'lucide-react';

export default function DecryptGate() {
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [inputText, setInputText] = useState('');
  const [password, setPassword] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [decryptedText, setDecryptedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (window.location.hash.startsWith('#enc=')) {
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

  const bufToB64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const b64ToBuf = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

  const handleEncrypt = async () => {
    setError('');
    if (!inputText || !password) return setError('Please enter text and a password.');
    try {
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(password, salt);
      const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(inputText));
      const link = `${window.location.origin}/decrypt#enc=${bufToB64(salt.buffer)}:${bufToB64(iv.buffer)}:${bufToB64(ciphertext)}`;
      setGeneratedLink(link);
    } catch (err) {
      setError('Encryption failed.');
    }
  };

  const handleDecrypt = async () => {
    setError('');
    if (!password) return setError('Please enter the password.');
    try {
      const hash = window.location.hash.replace('#enc=', '');
      const parts = hash.split(':');
      if (parts.length !== 3) return setError('Corrupted link.');
      const [saltB64, ivB64, cipherB64] = parts;
      const salt = b64ToBuf(saltB64);
      const iv = b64ToBuf(ivB64);
      const ciphertext = b64ToBuf(cipherB64);
      const key = await deriveKey(password, salt);
      const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
      setDecryptedText(dec.decode(decrypted));
    } catch (err) {
      setError('Decryption failed. Incorrect password or corrupted link.');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6">
        <ArrowLeft /> Back
      </button>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Shield /> Secure Share</h1>
      
      <div className="flex bg-slate-900 rounded-xl p-1 mb-6 max-w-md">
        <button onClick={() => setMode('encrypt')} className={`flex-1 py-2 rounded-lg font-semibold ${mode === 'encrypt' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Encrypt</button>
        <button onClick={() => setMode('decrypt')} className={`flex-1 py-2 rounded-lg font-semibold ${mode === 'decrypt' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Decrypt</button>
      </div>

      <div className="max-w-2xl space-y-4">
        {mode === 'encrypt' ? (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Text to Encrypt</label>
              <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} className="w-full h-32 p-3 bg-slate-900 text-slate-200 outline-none resize-none text-sm rounded-lg border border-slate-700 focus:ring-2 focus:ring-indigo-500" placeholder="Enter your secret text..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-slate-900 text-slate-200 outline-none text-sm rounded-lg border border-slate-700 focus:ring-2 focus:ring-indigo-500" placeholder="Enter a strong password" />
            </div>
            <button onClick={handleEncrypt} className="px-6 py-3 bg-indigo-600 rounded-lg font-semibold flex items-center gap-2 hover:bg-indigo-700"><Lock className="w-4 h-4" /> Encrypt & Generate Link</button>
            
            {generatedLink && (
              <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">Shareable Link</span>
                  <button onClick={copyLink} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-xs font-semibold">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-slate-500 break-all">{generatedLink}</p>
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-slate-900 text-slate-200 outline-none text-sm rounded-lg border border-slate-700 focus:ring-2 focus:ring-indigo-500" placeholder="Enter the password" />
            </div>
            <button onClick={handleDecrypt} className="px-6 py-3 bg-indigo-600 rounded-lg font-semibold flex items-center gap-2 hover:bg-indigo-700"><Unlock className="w-4 h-4" /> Decrypt Message</button>
            
            {decryptedText && (
              <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
                <span className="text-xs font-bold text-slate-400 uppercase">Decrypted Text</span>
                <p className="text-sm text-slate-200 mt-2 whitespace-pre-wrap">{decryptedText}</p>
              </div>
            )}
          </>
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    </div>
  );
}
