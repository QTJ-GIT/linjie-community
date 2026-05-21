'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Floating "back to top" button.
 * - Appears after scrolling past 400px.
 * - Smooth scroll on click.
 * - Respects prefers-reduced-motion for both its own entrance and the scroll.
 */
export function ScrollToTop({ className }: { className?: string }) {
  const [visible, setVisible] = React.useState(false);
  const reduced = useReducedMotion();

  React.useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 400);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = () => {
    window.scrollTo({
      top: 0,
      behavior: reduced ? 'auto' : 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          onClick={handleClick}
          aria-label="返回顶部"
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={cn(
            'fixed bottom-6 right-6 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-md backdrop-blur',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            'active:scale-95 transition-transform duration-75',
            className
          )}
        >
          <ArrowUp className="h-4 w-4" />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
