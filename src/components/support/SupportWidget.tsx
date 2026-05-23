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
          'fixed z-50 flex items-center gap-2 rounded-full px-4 py-3 shadow-xl transition-all duration-300 hover:scale-105',
          'bottom-20 right-4 sm:bottom-6 sm:right-6',
          isOpen
            ? 'bg-muted text-muted-foreground rotate-0'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
        aria-label="客服"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="text-sm font-medium">客服</span>
      </button>

      {/* 客服对话浮窗 */}
      <SupportChat isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
