'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface BlurFadeProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  yOffset?: number;
  className?: string;
}

/**
 * BlurFade —— framer-motion 包装的渐入动效，新增项追加时使用，
 * 让追加的卡片有"轻轻浮上"的入场反馈。
 *
 * - 尊重 prefers-reduced-motion：直接渲染子元素不加动画
 * - 仅控制 opacity / blur / y，避免对布局造成抖动
 */
export function BlurFade({
  children,
  delay = 0,
  duration = 0.25,
  yOffset = 6,
  className,
}: BlurFadeProps) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(6px)', y: yOffset }}
      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
