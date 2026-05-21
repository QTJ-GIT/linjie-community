import * as React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * EmptyState —— 统一的空状态展示。
 */

type ActionHref = { label: string; href: string };
type ActionClick = { label: string; onClick: () => void };

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ActionHref | ActionClick;
  className?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 bg-muted/15 px-6 py-16 text-center',
        className
      )}
    >
      <div className="relative flex h-20 w-20 items-center justify-center">
        {/* soft brand-gradient halo */}
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-brand-gradient opacity-15 blur-xl"
        />
        <span
          aria-hidden="true"
          className="absolute inset-2 rounded-full bg-brand-gradient-soft"
        />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-background ring-1 ring-border/60">
          <Icon className="h-6 w-6 text-[hsl(var(--brand-500))]" aria-hidden="true" />
        </span>
      </div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {action ? (
        'href' in action ? (
          <Button asChild size="sm" className="mt-1">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button size="sm" className="mt-1" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      ) : null}
    </div>
  );
}
