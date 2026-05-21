'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { CommandPalette } from '@/components/command-palette';
import { KeyboardHelp } from '@/components/keyboard-help';

/**
 * 挂载在根布局的客户端组件：
 *  - 注册全局快捷键
 *  - 渲染命令面板与键盘帮助弹窗
 */
export function ShortcutsProvider() {
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const openPalette = useCallback(() => {
    setHelpOpen(false);
    setPaletteOpen(true);
  }, []);

  useHotkeys({
    'cmd+k': (e) => {
      e.preventDefault();
      openPalette();
    },
    'ctrl+k': (e) => {
      e.preventDefault();
      openPalette();
    },
    '/': (e) => {
      e.preventDefault();
      openPalette();
    },
    '?': (e) => {
      e.preventDefault();
      setPaletteOpen(false);
      setHelpOpen(true);
    },
    'g f': () => router.push('/feed'),
    'g t': () => router.push('/trending'),
    'g c': () => router.push('/chat/lobby'),
    'g n': () => router.push('/notifications'),
    'g p': () => router.push('/profile'),
  });

  return (
    <>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <KeyboardHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}
