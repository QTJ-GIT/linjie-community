'use client';

import { motion, type Variants } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** 子项错落延迟 (秒) */
  stagger?: number;
  /** 整体延迟 */
  delay?: number;
  /** 入场进入视口比例 0-1 */
  amount?: number;
  /** 一次性触发 */
  once?: boolean;
  /** 垂直偏移 px */
  yOffset?: number;
  /** 包装元素，默认 div */
  as?: 'div' | 'ul' | 'section';
}

/**
 * ScrollReveal 滚动入场容器：
 *
 * 子节点（直接 motion 子节点 OR 普通子节点）会按 stagger 错落入场。
 * 直接子节点请使用 <ScrollRevealItem /> 包裹以应用变体。
 */
export function ScrollReveal({
  children,
  className,
  stagger = 0.06,
  delay = 0,
  amount = 0.2,
  once = true,
  yOffset = 14,
  as = 'div',
}: ScrollRevealProps) {
  const reduced = useReducedMotion();

  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: yOffset },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: 'easeOut' },
    },
  };

  if (reduced) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = as === 'ul' ? motion.ul : as === 'section' ? motion.section : motion.div;

  return (
    <MotionTag
      className={cn(className)}
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      // 让默认 item 变体可被 children 通过 variants={undefined} 时继承
      custom={itemVariants}
    >
      {children}
    </MotionTag>
  );
}

/** 单个 reveal 子项，用于在 ScrollReveal 中包裹任意 children */
export function ScrollRevealItem({
  children,
  className,
  yOffset = 14,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  yOffset?: number;
  as?: 'div' | 'li' | 'article';
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const variants: Variants = {
    hidden: { opacity: 0, y: yOffset },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: 'easeOut' },
    },
  };

  const MotionTag =
    as === 'li' ? motion.li : as === 'article' ? motion.article : motion.div;

  return (
    <MotionTag className={className} variants={variants}>
      {children}
    </MotionTag>
  );
}
