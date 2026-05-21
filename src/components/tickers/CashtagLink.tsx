import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface CashtagLinkProps {
  symbol: string;
  raw?: string;
  className?: string;
}

export function CashtagLink({ symbol, raw, className }: CashtagLinkProps) {
  const label = raw ?? `$${symbol}`;
  return (
    <Link
      href={`/tickers/${symbol}`}
      className={cn(
        'inline-flex items-center rounded bg-emerald-500/10 px-1 text-emerald-600 hover:bg-emerald-500/20 hover:underline dark:text-emerald-400',
        className
      )}
    >
      {label}
    </Link>
  );
}
