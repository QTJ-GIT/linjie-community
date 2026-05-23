'use client';

import React, { useEffect, useState } from 'react';
import {
  getSupportSessions,
  getSupportMessages,
  replySupportMessage,
  closeSupportSession,
  type SupportSession,
  type SupportMessage,
} from '@/actions/support';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, X, Headphones, User, Bot, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminSupportPage() {
  const [sessions, setSessions] = useState<SupportSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    const data = await getSupportSessions();
    setSessions(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!selectedId) return;
    const load = async () => {
      const msgs = await getSupportMessages(selectedId);
      setMessages(msgs);
    };
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [selectedId]);

  const handleReply = async () => {
    if (!replyContent.trim() || !selectedId || sending) return;
    setSending(true);
    const res = await replySupportMessage(selectedId, replyContent.trim());
    if (res.ok) {
      setReplyContent('');
      const msgs = await getSupportMessages(selectedId);
      setMessages(msgs);
      loadSessions();
    } else {
      toast.error(res.error || '发送失败');
    }
    setSending(false);
  };

  const handleClose = async (sessionId: string) => {
    const res = await closeSupportSession(sessionId);
    if (res.ok) {
      toast.success('会话已关闭');
      loadSessions();
      if (selectedId === sessionId) {
        setSelectedId(null);
        setMessages([]);
      }
    } else {
      toast.error(res.error || '关闭失败');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleReply();
    }
  };

  const selectedSession = sessions.find((s) => s.id === selectedId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">客服中心</h2>
        <p className="text-sm text-muted-foreground">
          管理用户咨询会话，回复用户问题
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 会话列表 */}
        <div className="rounded-xl border border-border/60 bg-card lg:col-span-1">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <h3 className="font-medium text-sm">会话列表</h3>
            <Button variant="ghost" size="sm" onClick={loadSessions}>
              刷新
            </Button>
          </div>
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                加载中...
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
                <MessageSquare className="mb-2 h-8 w-8 opacity-40" />
                暂无会话
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50',
                      selectedId === s.id && 'bg-accent'
                    )}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {s.user_name}
                        </span>
                        <Badge
                          variant={s.status === 'open' ? 'default' : 'secondary'}
                          className="shrink-0 text-[10px]"
                        >
                          {s.status === 'open' ? '进行中' : '已关闭'}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.last_message || '暂无消息'}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                        {new Date(s.updated_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* 消息详情 */}
        <div className="flex flex-col rounded-xl border border-border/60 bg-card lg:col-span-2">
          {selectedSession ? (
            <>
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-primary" />
                  <div>
                    <span className="text-sm font-medium">
                      {selectedSession.user_name}
                    </span>
                    {selectedSession.user_email && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {selectedSession.user_email}
                      </span>
                    )}
                  </div>
                </div>
                {selectedSession.status === 'open' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-red-500 hover:bg-red-500/10 hover:text-red-600"
                    onClick={() => handleClose(selectedSession.id)}
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    关闭会话
                  </Button>
                )}
              </div>

              <ScrollArea className="flex-1 px-4 py-3">
                <div className="space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                      暂无消息
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex gap-2',
                          msg.sender_type === 'admin'
                            ? 'flex-row-reverse'
                            : 'flex-row'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                            msg.sender_type === 'admin'
                              ? 'bg-primary/10'
                              : msg.sender_type === 'user'
                              ? 'bg-green-500/10'
                              : 'bg-muted'
                          )}
                        >
                          {msg.sender_type === 'admin' ? (
                            <Headphones className="h-3.5 w-3.5 text-primary" />
                          ) : msg.sender_type === 'user' ? (
                            <User className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <div
                          className={cn(
                            'max-w-[70%] rounded-2xl px-3 py-2 text-sm',
                            msg.sender_type === 'admin'
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : msg.sender_type === 'user'
                              ? 'bg-green-500/10 text-foreground rounded-bl-md border border-green-500/20'
                              : 'bg-muted text-foreground rounded-bl-md'
                          )}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </p>
                          <div className="mt-1 flex items-center gap-1">
                            <span className="text-[10px] opacity-60">
                              {new Date(msg.created_at).toLocaleTimeString(
                                'zh-CN',
                                { hour: '2-digit', minute: '2-digit' }
                              )}
                            </span>
                            {msg.admin_name && (
                              <span className="text-[10px] opacity-60">
                                · {msg.admin_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {selectedSession.status === 'open' && (
                <div className="flex items-center gap-2 border-t border-border/60 p-3">
                  <Input
                    placeholder="输入回复内容..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1"
                    disabled={sending}
                  />
                  <Button
                    size="icon"
                    onClick={handleReply}
                    disabled={!replyContent.trim() || sending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-sm text-muted-foreground">
              <MessageSquare className="mb-3 h-12 w-12 opacity-30" />
              <p>选择左侧会话开始回复</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
