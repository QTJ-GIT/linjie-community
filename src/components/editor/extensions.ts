import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import Image from '@tiptap/extension-image';
import { ReactRenderer } from '@tiptap/react';
import type { Extensions } from '@tiptap/core';
import type { SuggestionOptions } from '@tiptap/suggestion';
import tippy, { type Instance as TippyInstance, type GetReferenceClientRect } from 'tippy.js';
import { MentionList, type MentionListHandle, type MentionListProps, type MentionItem } from './MentionList';
import { createClient } from '@/lib/supabase/client';

const MENTION_LIMIT = 8;

type SuggestionInstance = TippyInstance;

const mentionSuggestion: Omit<SuggestionOptions<MentionItem>, 'editor'> = {
  char: '@',
  allowSpaces: false,

  items: async ({ query }): Promise<MentionItem[]> => {
    const prefix = query.trim();
    const supabase = createClient();
    if (!prefix) {
      const { data } = await supabase
        .from('profiles')
        .select('id, handle, display_name, avatar_url')
        .order('handle', { ascending: true })
        .limit(MENTION_LIMIT);
      return (data ?? []) as MentionItem[];
    }

    // Escape LIKE metacharacters from the prefix.
    const escaped = prefix.replace(/[%_]/g, (m) => `\\${m}`);
    const { data } = await supabase
      .from('profiles')
      .select('id, handle, display_name, avatar_url')
      .ilike('handle', `${escaped}%`)
      .limit(MENTION_LIMIT);
    return (data ?? []) as MentionItem[];
  },

  render: () => {
    let reactRenderer: ReactRenderer<MentionListHandle, MentionListProps> | null = null;
    let popup: SuggestionInstance | null = null;

    return {
      onStart: (props) => {
        reactRenderer = new ReactRenderer(MentionList, {
          props: { items: props.items, command: props.command },
          editor: props.editor,
        });

        if (!props.clientRect) return;

        const [instance] = tippy('body', {
          getReferenceClientRect: props.clientRect as GetReferenceClientRect,
          appendTo: () => document.body,
          content: reactRenderer.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
        popup = instance ?? null;
      },

      onUpdate: (props) => {
        reactRenderer?.updateProps({ items: props.items, command: props.command });
        if (!props.clientRect) return;
        popup?.setProps({
          getReferenceClientRect: props.clientRect as GetReferenceClientRect,
        });
      },

      onKeyDown: (props) => {
        if (props.event.key === 'Escape') {
          popup?.hide();
          return true;
        }
        return reactRenderer?.ref?.onKeyDown({ event: props.event }) ?? false;
      },

      onExit: () => {
        popup?.destroy();
        reactRenderer?.destroy();
        popup = null;
        reactRenderer = null;
      },
    };
  },
};

export function buildExtensions(placeholder?: string): Extensions {
  // `placeholder` is accepted for API symmetry but the StarterKit placeholder
  // extension is not configured here to keep the bundle lean; editor uses a
  // CSS-driven placeholder fallback in the component.
  void placeholder;

  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: {},
      bulletList: {},
      orderedList: {},
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: {
        class: 'text-primary underline underline-offset-2',
        rel: 'noopener noreferrer nofollow',
        target: '_blank',
      },
    }),
    Mention.configure({
      HTMLAttributes: {
        class: 'bg-accent text-accent-foreground rounded px-1',
      },
      // Use the user's handle as the mention id so body_text contains "@handle"
      // for the DB trigger that extracts mentions.
      renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
      suggestion: mentionSuggestion,
    }),
    Image.configure({
      inline: false,
      allowBase64: false,
      HTMLAttributes: {
        class: 'rounded-md max-w-full',
      },
    }),
  ];
}
