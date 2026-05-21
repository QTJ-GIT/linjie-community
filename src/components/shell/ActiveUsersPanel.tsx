import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getActiveUsers } from '@/lib/active-users';
import { cn } from '@/lib/utils';

export async function ActiveUsersPanel({ className }: { className?: string }) {
  const users = await getActiveUsers(5);
  if (users.length === 0) return null;
  return (
    <div className={cn('px-3 py-2', className)}>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        现在活跃 · {users.length}
      </p>
      <ul className="space-y-1">
        {users.map((u) => {
          const initials = (u.display_name ?? u.handle ?? '?').slice(0, 1);
          return (
            <li key={u.id}>
              <Link
                href={`/profile/${u.handle}`}
                className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-muted/60 transition-colors"
              >
                <Avatar className="h-5 w-5">
                  {u.avatar_url ? <AvatarImage src={u.avatar_url} alt={u.display_name} /> : null}
                  <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
                </Avatar>
                <span className="truncate font-medium text-foreground">{u.display_name}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground/70">@{u.handle}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
