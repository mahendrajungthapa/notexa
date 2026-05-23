'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import ImageExt from '@tiptap/extension-image';
import LinkExt from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Bold, Italic, Underline as UIcon, Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Quote, Code, Code2, Image, Link2, AlignLeft, AlignCenter, AlignRight, Highlighter, Undo, Redo, Minus } from 'lucide-react';
import { useEffect } from 'react';

interface Props { content: string; onChange: (c: string) => void; editable?: boolean; }

export default function NoteEditor({ content, onChange, editable = true }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: 'Start writing your note...' }),
      Highlight, TaskList, TaskItem.configure({ nested: true }),
      ImageExt, LinkExt.configure({ openOnClick: false }), Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: content || '',
    editable,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: 'prose prose-sm max-w-none focus:outline-none' },
    },
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== (content || '')) {
      editor.commands.setContent(content || '', { emitUpdate: false });
    }
  }, [content, editor]);
  useEffect(() => { if (editor) editor.setEditable(editable); }, [editable, editor]);

  if (!editor) return null;

  const TB = ({ onClick, active, children, title }: any) => (
    <button type="button" onClick={onClick} title={title}
      className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}>
      {children}
    </button>
  );

  const Sep = () => <div className="w-px h-5 bg-gray-200 mx-0.5" />;

  return (
    <div className="tiptap-editor">
      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-gray-200 bg-gray-50/80 sticky top-0 z-10">
          <TB onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold size={15} /></TB>
          <TB onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic size={15} /></TB>
          <TB onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><UIcon size={15} /></TB>
          <TB onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strike"><Strikethrough size={15} /></TB>
          <TB onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight"><Highlighter size={15} /></TB>
          <Sep />
          <TB onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading',{level:1})} title="H1"><Heading1 size={15} /></TB>
          <TB onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading',{level:2})} title="H2"><Heading2 size={15} /></TB>
          <TB onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading',{level:3})} title="H3"><Heading3 size={15} /></TB>
          <Sep />
          <TB onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullets"><List size={15} /></TB>
          <TB onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbers"><ListOrdered size={15} /></TB>
          <TB onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Tasks"><CheckSquare size={15} /></TB>
          <Sep />
          <TB onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote"><Quote size={15} /></TB>
          <TB onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline Code"><Code size={15} /></TB>
          <TB onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code Block"><Code2 size={15} /></TB>
          <TB onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus size={15} /></TB>
          <Sep />
          <TB onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({textAlign:'left'})} title="Left"><AlignLeft size={15} /></TB>
          <TB onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({textAlign:'center'})} title="Center"><AlignCenter size={15} /></TB>
          <TB onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({textAlign:'right'})} title="Right"><AlignRight size={15} /></TB>
          <Sep />
          <TB onClick={() => { const u = window.prompt('Image URL:'); if (u) editor.chain().focus().setImage({ src: u }).run(); }} title="Image"><Image size={15} /></TB>
          <TB onClick={() => { const u = window.prompt('Link URL:'); if (u) editor.chain().focus().setLink({ href: u }).run(); }} active={editor.isActive('link')} title="Link"><Link2 size={15} /></TB>
          <div className="flex-1" />
          <TB onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo size={15} /></TB>
          <TB onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo size={15} /></TB>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
