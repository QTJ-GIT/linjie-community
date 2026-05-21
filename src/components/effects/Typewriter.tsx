'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

export interface TypewriterProps {
  /** 要循环切换的文字 */
  lines: string[];
  /** 单字符打字间隔 ms */
  typeMs?: number;
  /** 单字符回退间隔 ms */
  deleteMs?: number;
  /** 一行写完停留 ms */
  holdMs?: number;
  className?: string;
  /** 光标颜色类（用 bg-* 控制） */
  cursorClassName?: string;
}

export function Typewriter({
  lines,
  typeMs = 80,
  deleteMs = 35,
  holdMs = 1600,
  className,
  cursorClassName = 'bg-foreground/70',
}: TypewriterProps) {
  const reduced = useReducedMotion();
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (reduced) return;
    if (lines.length === 0) return;
    const current = lines[lineIdx] ?? '';

    if (!deleting && charIdx < current.length) {
      const t = setTimeout(() => setCharIdx((i) => i + 1), typeMs);
      return () => clearTimeout(t);
    }
    if (!deleting && charIdx === current.length) {
      const t = setTimeout(() => setDeleting(true), holdMs);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx > 0) {
      const t = setTimeout(() => setCharIdx((i) => i - 1), deleteMs);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx === 0) {
      setDeleting(false);
      setLineIdx((i) => (i + 1) % lines.length);
    }
  }, [charIdx, deleting, lineIdx, lines, typeMs, deleteMs, holdMs, reduced]);

  if (reduced) {
    // 静态显示第一行，无光标
    return <span className={className}>{lines[0] ?? ''}</span>;
  }

  const text = (lines[lineIdx] ?? '').slice(0, charIdx);

  return (
    <span className={cn('inline-flex items-baseline', className)}>
      <span>{text || ' '}</span>
      <span
        className={cn(
          'ml-1 inline-block h-[1em] w-[2px] animate-lj-blink rounded-sm',
          cursorClassName
        )}
      />
      <style jsx global>{`
        @keyframes lj-blink {
          0%,
          49% {
            opacity: 1;
          }
          50%,
          100% {
            opacity: 0;
          }
        }
        .animate-lj-blink {
          animation: lj-blink 1s steps(2, start) infinite;
        }
      `}</style>
    </span>
  );
}
