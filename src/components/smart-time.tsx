'use client';

import { formatRelative } from '@/lib/utils';

type SmartTimeProps = {
  iso: string;
  className?: string;
};

/**
 * Renders a relative timestamp like "3 分钟前" with an absolute tooltip and
 * a semantic <time dateTime={iso}> element so screen readers and
 * crawlers see the machine-readable timestamp.
 */
export function SmartTime({ iso, className }: SmartTimeProps) {
  const absolute = new Date(iso).toLocaleString('zh-CN');
  return (
    <time dateTime={iso} title={absolute} className={className} suppressHydrationWarning>
      {formatRelative(iso)}
    </time>
  );
}

export default SmartTime;
