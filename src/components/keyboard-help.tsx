'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface Shortcut {
  keys: string[];
  desc: string;
}

const GROUPS: Array<{ title: string; items: Shortcut[] }> = [
  {
    title: '通用',
    items: [
      { keys: ['Cmd', 'K'], desc: '打开命令面板' },
      { keys: ['Ctrl', 'K'], desc: '打开命令面板（Windows/Linux）' },
      { keys: ['/'], desc: '快速聚焦搜索（打开命令面板）' },
      { keys: ['?'], desc: '显示键盘快捷键' },
      { keys: ['Esc'], desc: '关闭弹层' },
    ],
  },
  {
    title: '快速跳转（先按 g，再按）',
    items: [
      { keys: ['g', 'f'], desc: '首页 Feed' },
      { keys: ['g', 't'], desc: '热门 Trending' },
      { keys: ['g', 'c'], desc: '公共聊天室' },
      { keys: ['g', 'n'], desc: '通知' },
      { keys: ['g', 'p'], desc: '个人主页' },
    ],
  },
  {
    title: '命令面板内',
    items: [
      { keys: ['↑', '↓'], desc: '移动选中项' },
      { keys: ['Enter'], desc: '执行当前项' },
    ],
  },
];

export interface KeyboardHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardHelp({ open, onOpenChange }: KeyboardHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>键盘快捷键</DialogTitle>
          <DialogDescription>像老手一样使用临介社区。</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {g.title}
              </h4>
              <ul className="divide-y divide-border/60 rounded-md border">
                {g.items.map((s, i) => (
                  <li key={i} className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
                    <span className="text-foreground/90">{s.desc}</span>
                    <span className="flex items-center gap-1">
                      {s.keys.map((k, ki) => (
                        <kbd
                          key={ki}
                          className="inline-flex min-w-[1.5rem] justify-center rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
