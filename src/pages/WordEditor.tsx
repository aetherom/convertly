import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Bold, Italic, Underline as UnderlineIcon, Strikethrough, Highlighter,
  AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Quote, Code, Undo, Redo,
  Table as TableIcon, Image as ImageIcon, RemoveFormatting, Plus, FileType2, FileCode2,
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import ImageExt from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import mammoth from 'mammoth';
import { FontSize } from '../extensions/FontSize';
import { saveBlob } from '../lib/save';
import { useToast } from '../components/Toaster';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ext = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';

export default function WordEditor() {
  const location = useLocation() as any;
  const navigate = useNavigate();
  const toast = useToast();
  const incoming: File | undefined = location.state?.file;

  const [fileName, setFileName] = useState(incoming ? incoming.name.replace(/\.[^.]+$/, '') : 'untitled');
  const [docxName, setDocxName] = useState('');
  const [wordCount, setWordCount] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExt,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight,
      ImageExt.configure({ inline: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: '<p>Start typing…</p>',
    onUpdate: ({ editor }) =>
      setWordCount(editor.getText().split(/\s+/).filter(Boolean).length),
  });

  // Import .docx / plain text on entry
  useEffect(() => {
    if (!incoming || !editor) return;
    (async () => {
      if (ext(incoming.name) === 'docx') {
        const arrayBuffer = await incoming.arrayBuffer();
        try {
          const result = await mammoth.convertToHtml({ arrayBuffer });
          editor.commands.setContent(result.value || '<p><em>(empty document)</em></p>');
          setDocxName(incoming.name);
        } catch {
          toast('Could not parse that .docx file.', 'err');
        }
      } else {
        const text = await incoming.text();
        editor.commands.setContent(text.split('\n').map((l) => `<p>${esc(l) || '<br>'}</p>`).join(''));
        setDocxName(incoming.name);
      }
    })();
  }, [incoming, editor]);

  const stats = useMemo(() => `${wordCount} words`, [wordCount]);

  const exportHtml = () =>
    saveBlob(new Blob([editor!.getHTML()], { type: 'text/html' }), `${fileName}.html`);

  const exportTxt = () =>
    saveBlob(new Blob([editor!.getText()], { type: 'text/plain' }), `${fileName}.txt`);

  const exportPdfPrint = () => {
    document.body.classList.add('print-doc');
    const cleanup = () => {
      document.body.classList.remove('print-doc');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(window.print, 50);
    setTimeout(cleanup, 4000); // safety net for browsers without afterprint
  };

  const openFile = (file?: File) => {
    if (!file) return;
    navigate(location.pathname, { state: { file }, replace: true });
    // remount trick: force reload of route state without app restart
    setTimeout(() => window.location.reload(), 0);
  };

  if (!editor) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading editor…</div>;

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap gap-2 justify-between items-center sticky top-0 z-10 no-print">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft /> Back
          </button>
          <input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="px-2 py-1 text-sm font-semibold text-slate-700 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-400 rounded outline-none"
            aria-label="Document name"
          />
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          <TBtn onClick={() => editor.chain().focus().undo().run()}><Undo className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => editor.chain().focus().redo().run()}><Redo className="w-4 h-4" /></TBtn>
          <Sep />
          <select
            onChange={(e) => (e.target.value ? editor.chain().focus().setFontFamily(e.target.value).run() : editor.chain().focus().unsetFontFamily().run())}
            defaultValue=""
            className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs outline-none"
          >
            <option value="">Font</option>
            <option>Arial</option><option>Georgia</option><option>Times New Roman</option><option>Courier New</option>
          </select>
          <select
            onChange={(e) => (e.target.value ? editor.chain().focus().setFontSize(e.target.value).run() : editor.chain().focus().unsetFontSize().run())}
            defaultValue=""
            className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs outline-none"
          >
            <option value="">Size</option>
            <option value="12px">12</option><option value="14px">14</option><option value="16px">16</option>
            <option value="20px">20</option><option value="28px">28</option><option value="36px">36</option>
          </select>
          <Sep />
          <TBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><Bold className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><Italic className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}><UnderlineIcon className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}><Strikethrough className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')}><Highlighter className="w-4 h-4" /></TBtn>
          <input type="color" title="Text colour" onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            className="w-7 h-7 rounded cursor-pointer bg-transparent border-none" />
          <Sep />
          <TBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })}><AlignLeft className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })}><AlignCenter className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })}><AlignRight className="w-4 h-4" /></TBtn>
          <Sep />
          <select
            onChange={(e) => {
              const chain = editor.chain().focus();
              if (!e.target.value) chain.setParagraph().run();
              else (chain as any).toggleHeading({ level: Number(e.target.value) as 1 | 2 | 3 }).run();
            }}
            defaultValue=""
            className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs outline-none"
          >
            <option value="">Paragraph</option>
            <option value="1">Heading 1</option><option value="2">Heading 2</option><option value="3">Heading 3</option>
          </select>
          <TBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}><List className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}><ListOrdered className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}><Quote className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')}><Code className="w-4 h-4" /></TBtn>
          <Sep />
          <TBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="w-4 h-4" /></TBtn>
          <label className="p-2 rounded-md hover:bg-slate-100 cursor-pointer text-slate-600" title="Insert image">
            <ImageIcon className="w-4 h-4" />
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const reader = new FileReader();
              reader.onload = () => editor.chain().focus().setImage({ src: reader.result as string }).run();
              reader.readAsDataURL(f);
            }} />
          </label>
          <TBtn onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><RemoveFormatting className="w-4 h-4" /></TBtn>
          <TBtn onClick={() => editor.chain().focus().setHorizontalRule().run()}><Plus className="w-4 h-4" /></TBtn>
          <Sep />

          <select
            onChange={(e) => { const v = e.target.value; e.currentTarget.selectedIndex = 0; if (v === 'pdf') exportPdfPrint(); else if (v === 'txt') exportTxt(); else if (v === 'html') exportHtml(); }}
            defaultValue=""
            className="px-2 py-1.5 bg-slate-100 text-slate-700 rounded-md text-xs outline-none"
          >
            <option value="" disabled>Export…</option>
            <option value="pdf">PDF (via print)</option>
            <option value="txt">Plain text (.txt)</option>
            <option value="html">Web page (.html)</option>
          </select>
          <button onClick={exportHtml} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold">
            <Download className="w-4 h-4" /> Save
          </button>
        </div>
      </nav>

      {!docxName && !location.state?.file && (
        <div className="max-w-4xl mx-auto mt-4 px-4">
          <div className="flex flex-wrap items-center gap-3 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl px-4 py-3 text-sm">
            <span>You're in a blank document.</span>
            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-300 rounded-lg cursor-pointer hover:bg-indigo-100">
              <FileType2 className="w-4 h-4" /> Open a .docx / .txt file
              <input type="file" accept=".docx,.txt,.md,.rtf" className="hidden" onChange={(e) => openFile(e.target.files?.[0])} />
            </label>
            <span className="text-indigo-400 flex items-center gap-1"><FileCode2 className="w-4 h-4" /> Note: legacy binary .doc / RTF are not parsed.</span>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto my-8 px-4 pb-16">
        <div id="print-area" className="bg-white shadow-lg rounded-lg px-8 md:px-12 py-10 text-slate-900">
          <EditorContent editor={editor} />
        </div>
        <div className="text-center text-xs text-slate-500 mt-4 no-print">{stats}</div>
      </div>
    </div>
  );
}

const Sep = () => <div className="w-px h-5 bg-slate-200 mx-1" />;
const TBtn = ({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) => (
  <button
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={`p-2 rounded-md transition-colors ${active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
  >
    {children}
  </button>
);
