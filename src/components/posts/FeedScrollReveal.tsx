'use client';

import type { ReactNode } from 'react';
import { ScrollReveal, ScrollRevealItem } from '@/components/effects/ScrollReveal';

/**
 * FeedScrollReveal —— feed card mode 第一屏入场动效。
 * 把 children（PostCard 列表）包成 stagger 出场。一次性触发。
 */
export function FeedScrollReveal({ children }: { children: ReactNode[] | ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <ScrollReveal as="div" className="space-y-3" stagger={0.05} amount={0.1} once>
      {items.map((child, i) => (
        <ScrollRevealItem key={i}>{child}</ScrollRevealItem>
      ))}
    </ScrollReveal>
  );
}
