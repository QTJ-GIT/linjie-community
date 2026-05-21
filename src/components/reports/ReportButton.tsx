'use client';

import * as React from 'react';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { reportContent } from '@/actions/reports';

export type ReportTargetType = 'post' | 'comment' | 'chat_message' | 'user';

export interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  className?: string;
  /** Set true to render a compact icon-only button; otherwise a ghost icon size sm button */
  iconOnly?: boolean;
}

export function ReportButton({
  targetType,
  targetId,
  className,
  iconOnly = true,
}: ReportButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [pending, startTransition] = React.useTransition();

  const submit = () => {
    const trimmed = reason.trim();
    if (trimmed.length < 1) {
      toast.error('请填写举报理由');
      return;
    }
    if (trimmed.length > 500) {
      toast.error('举报理由最多 500 字');
      return;
    }
    startTransition(async () => {
      const res = await reportContent({
        target_type: targetType,
        target_id: targetId,
        reason: trimmed,
      });
      if (res.ok) {
        toast.success('已提交举报，感谢反馈');
        setReason('');
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="举报"
          title="举报"
          className={cn(className)}
        >
          <Flag className="h-4 w-4" />
          {iconOnly ? <span className="sr-only">举报</span> : <span>举报</span>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>举报内容</DialogTitle>
          <DialogDescription>
            请简要说明该内容违反规定的原因，方便管理员审核处理。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="请描述违规原因，例如垃圾广告、人身攻击、违法内容等"
            rows={5}
            maxLength={500}
            disabled={pending}
          />
          <div className="text-right text-xs text-muted-foreground">
            {reason.length}/500
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            取消
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? '提交中…' : '提交举报'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ReportButton;
