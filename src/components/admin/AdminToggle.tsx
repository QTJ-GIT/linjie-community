'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { toggleUserAdmin } from '@/actions/admin';

export function AdminToggle({
  userId,
  initialIsAdmin,
}: {
  userId: string;
  initialIsAdmin: boolean;
}) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = React.useState(initialIsAdmin);
  const [pending, startTransition] = React.useTransition();

  const onClick = () => {
    const next = !isAdmin;
    startTransition(async () => {
      const res = await toggleUserAdmin(userId, next);
      if (res.ok) {
        setIsAdmin(next);
        toast.success(next ? '已授予管理员' : '已取消管理员');
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Button
      type="button"
      variant={isAdmin ? 'outline' : 'default'}
      size="sm"
      onClick={onClick}
      disabled={pending}
    >
      {isAdmin ? '取消管理员' : '设为管理员'}
    </Button>
  );
}
