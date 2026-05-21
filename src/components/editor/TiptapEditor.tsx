'use client';

import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import 'tippy.js/dist/tippy.css';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { buildExtensions } from './extensions';
import { tiptapToText } from '@/lib/tiptap-to-text';
import { uploadPostImage } from '@/lib/upload';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TiptapDoc = Record<string, unknown>;

export interface TiptapEditorProps {
  value: TiptapDoc | null;
  onChange: (json: TiptapDoc, text: string) => void;
  placeholder?: string;
  className?: string;
}

async function uploadAndInsert(editor: Editor, file: File) {
  try {
    const url = await uploadPostImage(file);
    editor.chain().focus().setImage({ src: url }).run();
  } catch (err) {
    const msg = err instanceof Error ? err.message : '上传失败';
    toast.error('图片上传失败', { description: msg });
  }
}

export function TiptapEditor({ value, onChange, placeholder, className }: TiptapEditorProps) {
  const extensions = React.useMemo(() => buildExtensions(placeholder), [placeholder]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions,
    content: value ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none min-h-[220px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'dark:prose-invert'
        ),
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items || items.length === 0) return false;
        const images: File[] = [];
        for (let i = 0; i < items.length; i += 1) {
          const item = items[i];
          if (item.kind === 'file' && item.type.startsWith('image/')) {
            const f = item.getAsFile();
            if (f) images.push(f);
          }
        }
        if (images.length === 0) return false;
        event.preventDefault();
        const ed = (view as unknown as { editor?: Editor }).editor;
        const target = ed ?? editor;
        if (!target) return true;
        images.forEach((f) => {
          void uploadAndInsert(target, f);
        });
        return true;
      },
      handleDrop(view, event) {
        const dt = (event as DragEvent).dataTransfer;
        const files = dt?.files;
        if (!files || files.length === 0) return false;
        const images: File[] = [];
        for (let i = 0; i < files.length; i += 1) {
          const f = files[i];
          if (f.type.startsWith('image/')) images.push(f);
        }
        if (images.length === 0) return false;
        event.preventDefault();
        const ed = (view as unknown as { editor?: Editor }).editor;
        const target = ed ?? editor;
        if (!target) return true;
        images.forEach((f) => {
          void uploadAndInsert(target, f);
        });
        return true;
      },
    },
    onUpdate({ editor: ed }) {
      const json = ed.getJSON() as TiptapDoc;
      const text = tiptapToText(json);
      onChange(json, text);
    },
  });

  const promptLink = React.useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('请输入链接地址', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const onPickImage = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // reset so the same file can be picked again later
      e.target.value = '';
      if (!file || !editor) return;
      await uploadAndInsert(editor, file);
    },
    [editor]
  );

  if (!editor) {
    return (
      <div className={cn('rounded-md border border-input bg-muted/40 min-h-[220px]', className)} />
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-1 rounded-md border border-input bg-muted/40 p-1">
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="加粗"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="斜体"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          label="标题 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label="标题 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="列表"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          label="代码块"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('link')}
          onClick={promptLink}
          label="链接"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onPickImage} label="插入图片">
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={onFileChange}
      />
      <EditorContent editor={editor} />
      {placeholder && editor.isEmpty ? (
        <p className="text-xs text-muted-foreground">{placeholder}</p>
      ) : null}
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  children,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="sm"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="h-8 px-2"
    >
      {children}
    </Button>
  );
}
