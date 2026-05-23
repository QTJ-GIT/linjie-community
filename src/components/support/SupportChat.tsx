'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Send, MessageCircle, User, Bot, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  createSupportSession,
  sendSupportMessage,
  getSupportMessages,
  getSupportFAQs,
  type SupportMessage,
  type SupportFAQ,
} from '@/actions/support';
import { toast } from 'sonner';

interface SupportChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportChat({ isOpen, onClose }: SupportChatProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [faqs, setFaqs] = useState<SupportFAQ[]>([]);
  const [showFAQs, setShowFAQs] = useState(true);
  const [userName, setUserName] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 加载 FAQ
  useEffect(() => {
    if (!isOpen) return;
    getSupportFAQs().then(setFaqs);
  }, [isOpen]);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 轮询消息
  useEffect(() => {
    if (!sessionId || !isOpen) return;
    const poll = () => {
      getSupportMessages(sessionId).then((msgs) => {
        setMessages(msgs);
      });
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [sessionId, isOpen]);

  const handleStart = async () => {
    const res = await createSupportSession({
      user_name: userName.trim() || undefined,
    });
    if (res.ok && res.sessionId) {
      setSessionId(res.sessionId);
      setHasStarted(true);
      setShowFAQs(false);
      // 欢迎消息
      setMessages([
        {
          id: 'welcome',
          session_id: res.sessionId,
          sender_type: 'system',
          content:
            '您好！欢迎来到临介社区客服中心。👋\n\n您可以输入问题，我会尽力为您解答。如需人工客服，请直接描述您的问题，管理员会尽快回复。',
          admin_id: null,
          created_at: new Date().toISOString(),
        },
      ]);
    } else {
      toast.error(res.error || '创建会话失败');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');

    // 乐观更新
    const optimisticMsg: SupportMessage = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      sender_type: 'user',
      content,
      admin_id: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const res = await sendSupportMessage(sessionId, content);
    if (res.ok) {
      // 重新拉取消息（包含自动回复）
      const msgs = await getSupportMessages(sessionId);
      setMessages(msgs);
    } else {
      toast.error(res.error || '发送失败');
    }
    setSending(false);
  };

  const handleFAQClick = async (faq: SupportFAQ) => {
    if (!sessionId) {
      const res = await createSupportSession({
        user_name: userName.trim() || undefined,
      });
      if (res.ok && res.sessionId) {
        setSessionId(res.sessionId);
        setHasStarted(true);
        setShowFAQs(false);
        // 发送 FAQ 问题并获取自动回复
        await sendSupportMessage(res.sessionId, faq.question);
        const msgs = await getSupportMessages(res.sessionId);
        setMessages(msgs);
      }
      return;
    }
    await sendSupportMessage(sessionId, faq.question);
    const msgs = await getSupportMessages(sessionId);
    setMessages(msgs);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex w-[380px] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl transition-all duration-300',
        isOpen
          ? 'h-[560px] opacity-100 translate-y-0'
          : 'h-0 opacity-0 translate-y-4 pointer-events-none'
      )}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-primary/90 to-primary px-4 py-3">
        <div className="flex items-center gap-2 text-primary-foreground">
          <Headphones className="h-5 w-5" />
          <div>
            <h3 className="font-semibold text-sm">临介社区客服</h3>
            <p className="text-[10px] opacity-80">
              {sessionId ? '在线中，随时为您解答' : '点击开始对话'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-primary-foreground/80 hover:bg-white/20 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!hasStarted ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-semibold">有什么可以帮您？</h4>
              <p className="text-xs text-muted-foreground">
                输入您的问题，我们会尽快为您解答
              </p>
            </div>
            <Input
              placeholder="您的称呼（可选）"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="max-w-[200px]"
            />
            <Button onClick={handleStart} className="w-full max-w-[200px]">
              开始对话
            </Button>

            {/* 快捷 FAQ */}
            {faqs.length > 0 && (
              <div className="w-full space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  常见问题
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {faqs.slice(0, 4).map((faq) => (
                    <button
                      key={faq.id}
                      onClick={() => handleFAQClick(faq)}
                      className="rounded-full border border-border/60 bg-accent/50 px-3 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"
                    >
                      {faq.question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-2',
                      msg.sender_type === 'user' ? 'flex-row-reverse' : 'flex-row'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                        msg.sender_type === 'user'
                          ? 'bg-primary/10'
                          : msg.sender_type === 'admin'
                          ? 'bg-green-500/10'
                          : 'bg-muted'
                      )}
                    >
                      {msg.sender_type === 'user' ? (
                        <User className="h-3.5 w-3.5 text-primary" />
                      ) : msg.sender_type === 'admin' ? (
                        <Headphones className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div
                      className={cn(
                        'max-w-[260px] rounded-2xl px-3 py-2 text-sm',
                        msg.sender_type === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : msg.sender_type === 'admin'
                          ? 'bg-green-500/10 text-foreground rounded-bl-md border border-green-500/20'
                          : 'bg-muted text-foreground rounded-bl-md'
                      )}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </p>
                      <span className="mt-1 block text-[10px] opacity-60">
                        {new Date(msg.created_at).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* 快捷 FAQ 按钮 */}
            {showFAQs && faqs.length > 0 && (
              <div className="border-t border-border/60 px-3 py-2">
                <div className="flex flex-wrap gap-1.5">
                  {faqs.slice(0, 5).map((faq) => (
                    <button
                      key={faq.id}
                      onClick={() => handleFAQClick(faq)}
                      className="rounded-full border border-border/40 bg-accent/30 px-2.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent transition-colors"
                    >
                      {faq.question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 输入区 */}
            <div className="flex items-center gap-2 border-t border-border/60 p-3">
              <Input
                placeholder="输入您的问题..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
                disabled={sending}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
