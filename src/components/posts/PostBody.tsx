import * as React from 'react';
import { splitCashtags } from '@/lib/cashtags';
import { CashtagLink } from '@/components/tickers/CashtagLink';
import { cn } from '@/lib/utils';

type TiptapMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

type TiptapNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: TiptapMark[];
  content?: TiptapNode[];
};

// URL scheme 白名单：阻断 javascript: / vbscript: / file: / data:text/html 等
// 注入面。Tiptap link mark 的 href 由用户输入 + server action 落库，
// 不在这里校验就会成 stored XSS。image src 同理（data:image/svg+xml 可嵌脚本）。
const SAFE_LINK_RE = /^(?:https?:|mailto:|\/|#)/i;
const SAFE_IMG_RE = /^(?:https?:|\/|data:image\/(?:png|jpeg|jpg|gif|webp|svg\+xml);)/i;

function safeLinkHref(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!SAFE_LINK_RE.test(trimmed)) return null;
  return trimmed;
}

function safeImgSrc(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!SAFE_IMG_RE.test(trimmed)) return null;
  return trimmed;
}

export interface PostBodyProps {
  doc: unknown;
  className?: string;
}

export function PostBody({ doc, className }: PostBodyProps) {
  if (!doc || typeof doc !== 'object') {
    return <div className={cn('text-muted-foreground', className)}>（空）</div>;
  }
  return (
    <div className={cn('prose prose-sm max-w-none dark:prose-invert', className)}>
      {renderNode(doc as TiptapNode, 'root')}
    </div>
  );
}

function renderNode(node: TiptapNode, key: React.Key): React.ReactNode {
  if (!node) return null;

  // Text leaves — wrap with marks, then split cashtags
  if (typeof node.text === 'string') {
    const segments = splitCashtags(node.text);
    const pieces = segments.map((seg, i) => {
      if (seg.kind === 'cashtag') {
        return <CashtagLink key={i} symbol={seg.symbol} raw={seg.raw} />;
      }
      return <React.Fragment key={i}>{seg.value}</React.Fragment>;
    });
    return applyMarks(pieces, node.marks, key);
  }

  const children = Array.isArray(node.content)
    ? node.content.map((c, i) => renderNode(c, i))
    : null;

  switch (node.type) {
    case 'doc':
      return <React.Fragment key={key}>{children}</React.Fragment>;
    case 'paragraph':
      return <p key={key}>{children}</p>;
    case 'heading': {
      const level = Number((node.attrs as { level?: number } | undefined)?.level ?? 1);
      const Tag = (`h${Math.min(Math.max(level, 1), 6)}` as unknown) as keyof JSX.IntrinsicElements;
      return <Tag key={key}>{children}</Tag>;
    }
    case 'bulletList':
      return <ul key={key}>{children}</ul>;
    case 'orderedList':
      return <ol key={key}>{children}</ol>;
    case 'listItem':
      return <li key={key}>{children}</li>;
    case 'blockquote':
      return <blockquote key={key}>{children}</blockquote>;
    case 'codeBlock':
      return (
        <pre key={key}>
          <code>{children}</code>
        </pre>
      );
    case 'horizontalRule':
      return <hr key={key} />;
    case 'hardBreak':
      return <br key={key} />;
    case 'image': {
      const attrs = (node.attrs ?? {}) as {
        src?: string;
        alt?: string;
        title?: string;
      };
      const src = safeImgSrc(typeof attrs.src === 'string' ? attrs.src : undefined);
      if (!src) return null;
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={key}
          src={src}
          alt={attrs.alt ?? ''}
          title={attrs.title}
          className="rounded-md max-w-full my-3"
        />
      );
    }
    case 'mention': {
      const label = (node.attrs as { label?: string; id?: string } | undefined)?.label
        ?? (node.attrs as { id?: string } | undefined)?.id
        ?? '';
      return (
        <span
          key={key}
          className="rounded bg-accent px-1 text-accent-foreground"
        >
          @{label}
        </span>
      );
    }
    default:
      return <React.Fragment key={key}>{children}</React.Fragment>;
  }
}

function applyMarks(
  nodes: React.ReactNode,
  marks: TiptapMark[] | undefined,
  key: React.Key
): React.ReactNode {
  if (!marks || marks.length === 0) {
    return <React.Fragment key={key}>{nodes}</React.Fragment>;
  }
  let wrapped: React.ReactNode = nodes;
  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        wrapped = <strong>{wrapped}</strong>;
        break;
      case 'italic':
        wrapped = <em>{wrapped}</em>;
        break;
      case 'code':
        wrapped = <code>{wrapped}</code>;
        break;
      case 'strike':
        wrapped = <s>{wrapped}</s>;
        break;
      case 'link': {
        const rawHref = (mark.attrs as { href?: string } | undefined)?.href;
        const href = safeLinkHref(typeof rawHref === 'string' ? rawHref : undefined);
        if (!href) {
          // 不安全或缺失的 scheme 退化为纯文本（保留视觉但不产生可点击链接）
          break;
        }
        wrapped = (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-primary underline underline-offset-2"
          >
            {wrapped}
          </a>
        );
        break;
      }
      default:
        break;
    }
  }
  return <React.Fragment key={key}>{wrapped}</React.Fragment>;
}
