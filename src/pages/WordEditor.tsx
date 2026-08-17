import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import { useState } from 'react';
import { 
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, 
  List, Type, Highlighter, Undo, Redo, Maximize, Minimize, Sparkles, Send, 
  Code, Quote, Table as TableIcon 
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';

export default function WordEditor() {
  const { isZenMode, toggleZenMode } = useEditorStore();
  const [aiPrompt, setAiPrompt] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Highlight,
      FontFamily,
    ],
    content: '<p>Start creating your masterpiece...</p>',
  });

  const handleAISubmit = () => {
    if (!editor || !aiPrompt) return;
    const selectedText = editor.state.selection.content().content.firstChild?.textContent || editor.getText();
    if (!selectedText) return alert("Highlight some text first!");

    let result = '';
    const p = aiPrompt.toLowerCase();
    if (p.includes('translate')) result = `(AI Translated): Hola ${selectedText}`; 
    else if (p.includes('bullet')) result = selectedText.split('. ').map(s => `<li>${s}</li>`).join('');
    else if (p.includes('summarize')) result = `(AI Summary): ${selectedText.substring(0, 50)}...`;
    else result = `(AI Enhanced): ${selectedText} - Modified by prompt: ${aiPrompt}`;

    if (p.includes('bullet')) editor.chain().focus().insertContent(`<ul>${result}</ul>`).run();
    else editor.chain().focus().insertContent(`<p>${result}</p>`).run();
    
    setAiPrompt('');
  };

  if (isZenMode) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-center justify-center p-8">
        <button onClick={toggleZenMode} className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white">
          <Minimize className="w-6 h-6" />
        </button>
        <div className="w-full max-w-3xl min-h-[80vh] bg-white text-black shadow-2xl rounded-lg p-12 outline-none text-lg leading-relaxed font-sans">
          <EditorContent editor={editor} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 flex flex-col">
      {/* Premium Ribbon UI */}
      <header className="bg-white border-b border-slate-300 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 rounded-lg">
              <Type className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-bold text-slate-800">Fileverse Word</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleZenMode} className="p-2 hover:bg-slate-100 rounded-md text-slate-600">
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Toolbar */}
        <div className="flex gap-1 flex-wrap p-2 items-center">
          <ToolBtn onClick={() => editor?.chain().focus().undo().run()}><Undo className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => editor?.chain().focus().redo().run()}><Redo className="w-4 h-4" /></ToolBtn>
          <div className="w-px h-6 bg-slate-300 mx-1"></div>
          
          <select onChange={e => editor?.chain().focus().setFontFamily(e.target.value).run()} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs border-none outline-none">
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
          </select>
          <select onChange={e => editor?.chain().focus().setFontSize(e.target.value).run()} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs border-none outline-none">
            <option value="12px">12</option>
            <option value="14px">14</option>
            <option value="16px">16</option>
            <option value="20px">20</option>
            <option value="24px">24</option>
          </select>
          
          <div className="w-px h-6 bg-slate-300 mx-1"></div>
          <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => editor?.chain().focus().toggleUnderline().run()}><UnderlineIcon className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => editor?.chain().focus().toggleHighlight().run()}><Highlighter className="w-4 h-4" /></ToolBtn>
          <input type="color" onChange={e => editor?.chain().focus().setColor(e.target.value).run()} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
          
          <div className="w-px h-6 bg-slate-300 mx-1"></div>
          <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('left').run()}><AlignLeft className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('center').run()}><AlignCenter className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('right').run()}><AlignRight className="w-4 h-4" /></ToolBtn>
          
          <div className="w-px h-6 bg-slate-300 mx-1"></div>
          <ToolBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}><Type className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => editor?.chain().focus().toggleCodeBlock().run()}><Code className="w-4 h-4" /></ToolBtn>
        </div>
      </header>

      {/* A4 Pagination Canvas */}
      <main className="flex-1 py-8 overflow-auto">
        <div className="w-[8.5in] min-h-[11in] bg-white shadow-2xl mx-auto p-[1in] outline-none text-slate-800 text-lg leading-relaxed font-sans">
          <EditorContent editor={editor} />
        </div>
      </main>

      {/* AI Command Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-xl z-50">
        <div className="bg-white shadow-2xl border border-slate-200 rounded-full px-4 py-3 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <input 
            type="text" 
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAISubmit()}
            placeholder="Ask AI: 'Translate to Spanish', 'Summarize', 'Make bullet points'..." 
            className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
          />
          <button onClick={handleAISubmit} className="text-indigo-600 font-bold text-sm hover:text-indigo-800 transition-colors p-1 hover:bg-indigo-50 rounded-full">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

const ToolBtn = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
  <button onClick={onClick} className="p-2 hover:bg-slate-100 rounded-md text-slate-600 transition-colors">{children}</button>
);
