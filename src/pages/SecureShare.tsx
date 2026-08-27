import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Unlock, Copy, Check } from 'lucide-react';
import { useToast } from '../components/Toaster';

const enc = new TextEncoder();
const dec = new TextDecoder();

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)) as any);
  }
  return btoa(bin);
}
const b64ToBuf = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function deriveKey(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export default function SecureShare() {
  const navigate = useNavigate();
  const toast = useToast();
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [text, setText] = useState('');
  const [password, setPassword] = useState('');
  const [link, setLink] = useState('');
  const [plain, setPlain] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (window.location.hash.startsWith('#enc=')) setMode('decrypt');
  }, []);

  const encrypt = async () => {
    setError('');
    if (!text || !password) return setError('Enter text and a password.');
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(password, salt);
      const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
      const payload = `${bufToB64(salt.buffer as ArrayBuffer)}:${bufToB64(iv.buffer as ArrayBuffer)}:${bufToB64(cipher)}`;
      setLink(`${window.location.origin}/secure-share#enc=${payload}`);
    } catch {
      setError('Encryption failed.');
    }
  };

  const parsePayload = (): string[] | null => {
    const h = window.location.hash;
    if (!h.startsWith('#enc=')) return null;
    const parts = h.slice(5).split(':'); // slice off "#enc="
    return parts.length === 3 ? parts : null;
  };

  const decrypt = async () => {
    setError('');
    if (!password) return setError('Enter the password.');
    const parts = parsePayload();
    if (!parts) return setError('Corrupted link.');
    try {
      const salt = b64ToBuf(parts[0]);
      const iv = b64ToBuf(parts[1]);
      const cipher = b64ToBuf(parts[2]);
      const key = await deriveKey(password, salt);
      const opened = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
      setPlain(dec.decode(opened));
    } catch {
      setError('Decryption failed — wrong password or corrupted link.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6">
        <ArrowLeft /> Back
      </button>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Shield className="text-indigo-400" /> Secure Share</h1>

      <div className="flex bg-slate-900 rounded-xl p-1 mb-6 max-w-md">
        {(['encrypt', 'decrypt'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-lg font-semibold capitalize ${mode === m ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="max-w-2xl space-y-4 pb-16">
        {mode === 'encrypt' ? (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Secret text…"
              className="w-full h-32 p-3 bg-slate-900 rounded-lg border border-slate-700 outline-none resize-none text-sm focus:ring-2 ring-indigo-500"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Strong password"
              className="w-full p-3 bg-slate-900 rounded-lg border border-slate-700 outline-none text-sm focus:ring-2 ring-indigo-500"
            />
            <button onClick={encrypt} className="px-6 py-3 bg-indigo-600 rounded-lg font-semibold hover:bg-indigo-700 flex items-center gap-2">
              <Lock className="w-4 h-4" /> Encrypt &amp; Generate Link
            </button>
            {link && (
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">Shareable link</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(link);
                      setCopied(true);
                      toast('Copied!', 'ok');
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-xs font-semibold"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-slate-500 break-all">{link}</p>
                <p className="text-[11px] text-slate-600 mt-2">Keep secrets under ~2 KB — long texts make unusably long links.</p>
              </div>
            )}
          </>
        ) : (
          <>
            {!plain ? (
              <>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && decrypt()}
                  placeholder="Password"
                  className="w-full p-3 bg-slate-900 rounded-lg border border-slate-700 outline-none text-sm focus:ring-2 ring-indigo-500"
                />
                <button onClick={decrypt} className="px-6 py-3 bg-indigo-600 rounded-lg font-semibold hover:bg-indigo-700 flex items-center gap-2">
                  <Unlock className="w-4 h-4" /> Decrypt
                </button>
                {!window.location.hash.startsWith('#enc=') && (
                  <p className="text-xs text-slate-500">Tip: open a share link (it contains #enc=…) to load the encrypted payload.</p>
                )}
              </>
            ) : (
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                <span className="text-xs font-bold text-slate-400 uppercase">Decrypted</span>
                <p className="text-sm text-slate-200 mt-2 whitespace-pre-wrap">{plain}</p>
              </div>
            )}
          </>
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    </div>
  );
}
