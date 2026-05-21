'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { voteOn } from '@/actions/votes';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export type MyVote = 1 | -1 | 0;

export interface VoteButtonsProps {
  targetType: 'post' | 'comment';
  targetId: string;
  initialScore: number;
  initialMyVote: MyVote;
  size?: 'sm' | 'default';
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

export function VoteButtons({
  targetType,
  targetId,
  initialScore,
  initialMyVote,
  size = 'sm',
  orientation = 'vertical',
  className,
}: VoteButtonsProps) {
  const [score, setScore] = React.useState<number>(initialScore);
  const [myVote, setMyVote] = React.useState<MyVote>(initialMyVote);
  const [pending, startTransition] = React.useTransition();
  const [bumpKey, setBumpKey] = React.useState(0);
  const [ringColor, setRingColor] = React.useState<'orange' | 'blue' | null>(null);
  const reduced = useReducedMotion();

  const submit = (nextVote: MyVote) => {
    const prevVote = myVote;
    const prevScore = score;
    const delta = nextVote - prevVote;

    setMyVote(nextVote);
    setScore(prevScore + delta);
    setBumpKey((k) => k + 1);
    if (nextVote === 1) setRingColor('orange');
    else if (nextVote === -1) setRingColor('blue');
    else setRingColor(null);

    startTransition(async () => {
      const res = await voteOn({
        target_type: targetType,
        target_id: targetId,
        value: nextVote,
      });
      if (res.ok) {
        setScore(res.data!.score);
        setMyVote(res.data!.value);
      } else {
        setMyVote(prevVote);
        setScore(prevScore);
        toast.error(res.error);
      }
    });
  };

  const onUp = () => submit(myVote === 1 ? 0 : 1);
  const onDown = () => submit(myVote === -1 ? 0 : -1);

  const iconSize = size === 'default' ? 'h-5 w-5' : 'h-4 w-4';
  const btnSize = size === 'default' ? 'h-8 w-8' : 'h-7 w-7';
  const textSize = size === 'default' ? 'text-sm' : 'text-xs';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 select-none',
        orientation === 'vertical' ? 'flex-col' : 'flex-row gap-1',
        className
      )}
    >
      <motion.button
        type="button"
        onClick={onUp}
        disabled={pending}
        aria-label="赞同"
        aria-pressed={myVote === 1}
        whileTap={reduced ? undefined : { scale: 0.9 }}
        className={cn(
          'relative inline-flex items-center justify-center rounded-md border border-transparent transition-colors',
          btnSize,
          'hover:bg-orange-500/10 hover:text-orange-500',
          'disabled:opacity-60',
          myVote === 1 && 'text-orange-500 bg-orange-500/10 border-orange-500/30 shadow-[0_0_10px_-2px_rgba(249,115,22,0.6)]'
        )}
      >
        <motion.span
          key={myVote === 1 ? `up-${bumpKey}` : 'up-idle'}
          initial={reduced || myVote !== 1 ? false : { y: -2, scale: 1 }}
          animate={{ y: 0, scale: myVote === 1 ? 1.15 : 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className="inline-flex"
        >
          <ArrowUp className={cn(iconSize, myVote === 1 && 'fill-current')} />
        </motion.span>
        <AnimatePresence>
          {ringColor === 'orange' && !reduced ? (
            <motion.span
              key={bumpKey}
              initial={{ opacity: 0.6, scale: 1 }}
              animate={{ opacity: 0, scale: 1.8 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-orange-500/60"
            />
          ) : null}
        </AnimatePresence>
      </motion.button>
      <motion.span
        key={`score-${score}`}
        initial={reduced ? false : { scale: 1.18 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 20 }}
        className={cn(
          'tabular-nums font-medium',
          textSize,
          myVote === 1 && 'text-orange-500',
          myVote === -1 && 'text-blue-500',
          myVote === 0 && 'text-muted-foreground'
        )}
      >
        {score}
      </motion.span>
      <motion.button
        type="button"
        onClick={onDown}
        disabled={pending}
        aria-label="反对"
        aria-pressed={myVote === -1}
        whileTap={reduced ? undefined : { scale: 0.9 }}
        className={cn(
          'relative inline-flex items-center justify-center rounded-md border border-transparent transition-colors',
          btnSize,
          'hover:bg-blue-500/10 hover:text-blue-500',
          'disabled:opacity-60',
          myVote === -1 && 'text-blue-500 bg-blue-500/10 border-blue-500/30 shadow-[0_0_10px_-2px_rgba(59,130,246,0.6)]'
        )}
      >
        <motion.span
          key={myVote === -1 ? `dn-${bumpKey}` : 'dn-idle'}
          initial={reduced || myVote !== -1 ? false : { y: 2, scale: 1 }}
          animate={{ y: 0, scale: myVote === -1 ? 1.15 : 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className="inline-flex"
        >
          <ArrowDown className={cn(iconSize, myVote === -1 && 'fill-current')} />
        </motion.span>
        <AnimatePresence>
          {ringColor === 'blue' && !reduced ? (
            <motion.span
              key={bumpKey}
              initial={{ opacity: 0.6, scale: 1 }}
              animate={{ opacity: 0, scale: 1.8 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-blue-500/60"
            />
          ) : null}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
