'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { TiptapEditorProps } from './TiptapEditor';

function EditorSkeleton() {
  return (
    <div
      aria-hidden
      className="min-h-[200px] w-full animate-pulse rounded-md border bg-muted/40"
    />
  );
}

/**
 * Lazy-loaded Tiptap editor. The Tiptap bundle (starter-kit + extensions +
 * tippy.js) weighs ~50KB+ gzipped; deferring it keeps the initial bundle
 * lighter for users that land on a page with the editor embedded but never
 * focus it.
 *
 * Client-only (ssr:false) — Tiptap requires DOM APIs at init.
 */
export const TiptapEditorLazy: ComponentType<TiptapEditorProps> = dynamic(
  () => import('./TiptapEditor').then((m) => ({ default: m.TiptapEditor })),
  { ssr: false, loading: () => <EditorSkeleton /> }
);
