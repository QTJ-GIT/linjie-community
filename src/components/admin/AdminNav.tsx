'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function AdminNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';
  const active =
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        'rounded-md px-3 py-1.5 font-medium transition-colors',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
      )}
    >
      {children}
    </Link>
  );
}
