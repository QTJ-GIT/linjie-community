'use client';

import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SupportChat } from './SupportChat';

export function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full shadow-2xl ring-2 ring-white/30 transition-all duration-300 hover:scale-110',
          isOpen
            ? 'bg-muted text-muted-foreground rotate-0'
            : 'bg-[hsl(var(--brand-500))] text-white hover:bg-[hsl(var(--brand-600))] animate-pulse'
        )}
        style={{ boxShadow: '0 8px 32px hsl(var(--brand-500) / 0.4)' }}
        aria-label="客服"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* 客服对话浮窗 */}
      <SupportChat isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
