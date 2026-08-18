import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, Download, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import mammoth from 'mammoth';

export default function WordEditor() {
  const location = useLocation();
  const [fileName, setFileName] = useState('document.docx');

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExt,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
    ],
    content: '<p>Start typing or drop a .docx file...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[60vh] p-8 text-slate-800'
      }
    }
  });

  useEffect(() => {
    const importFile = async () => {
      if (!location.state || !location.state.file) return;
      const file = location.state.file as File;
      setFileName(file.name);
      
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        mammoth.convertToHtml({ arrayBuffer })
          .then((result: any) => {
            if (editor) editor.commands.setContent(result.value);
          })
          .catch((err: any) => console.error(err));
      } else if (file.name.endsWith('.txt')) {
        const text = await file.text();
        if (editor) editor.commands.setContent(`<p>${text}</p>`);
      }
    };
    importFile();
  }, [location.state, editor]);

  useEffect(() => {
    if (!location.state || !location.state.file) {
      window.location.href = '/';
    }
  }, [location.state]);

  const handleExport = () => {
    if (!editor) return;
    const html = editor.getHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace(/\.[^/.]+$/, '') + '.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!editor) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading Editor...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-white border-b border-slate-200 px-4 py-2 flex justify-between items-center sticky top-0 z-10">
        <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
          <ArrowLeft /> Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded ${editor.isActive('bold') ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'}`}><Bold className="w-4 h-4" /></button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded ${editor.isActive('italic') ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'}`}><Italic className="w-4 h-4" /></button>
          <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-2 rounded ${editor.isActive('underline') ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'}`}><Underline className="w-4 h-4" /></button>
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`p-2 rounded ${editor.isActive({ textAlign: 'left' }) ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'}`}><AlignLeft className="w-4 h-4" /></button>
          <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`p-2 rounded ${editor.isActive({ textAlign: 'center' }) ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'}`}><AlignCenter className="w-4 h-4" /></button>
          <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`p-2 rounded ${editor.isActive({ textAlign: 'right' }) ? 'bg-slate-200 text-indigo-600' : 'text-slate-600'}`}><AlignRight className="w-4 h-4" /></button>
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          <input 
            type="color" 
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} 
            className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
            title="Text Color"
          />
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto mt-8 bg-white shadow-lg rounded-lg">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
