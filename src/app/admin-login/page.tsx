'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Eye, EyeOff, Loader2, AlertCircle, KeyRound, ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { verifyAdminInviteCode, prepareAdminAccount } from '@/actions/admin-auth';

type Step = 'invite' | 'credentials';

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>('invite');

  const [inviteCode, setInviteCode] = React.useState('');
  const [inviteError, setInviteError] = React.useState('');
  const [inviteLoading, setInviteLoading] = React.useState(false);

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPwd, setShowPwd] = React.useState(false);
  const [loginError, setLoginError] = React.useState('');
  const [loginLoading, setLoginLoading] = React.useState(false);

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim()) { setInviteError('请输入邀请码'); return; }
    setInviteLoading(true);
    setInviteError('');
    try {
      const valid = await verifyAdminInviteCode(inviteCode.trim());
      if (!valid) { setInviteError('邀请码无效，请联系超级管理员'); return; }
      setStep('credentials');
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    if (!email.trim() || !password) { setLoginError('请填写邮箱和密码'); return; }
    setLoginLoading(true);
    try {
      // 服务端：验证邀请码 + 确认邮箱 + 授予管理员权限
      const prep = await prepareAdminAccount(inviteCode.trim(), email.trim());
      if (!prep.ok) { setLoginError(prep.error ?? '授权失败'); return; }

      // 客户端：正常登录
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) { setLoginError('邮箱或密码错误'); return; }

      router.push('/admin');
      router.refresh();
    } finally {
      setLoginLoading(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* 返回键 */}
      <Link
        href="/feed"
        className="absolute left-4 top-4 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        返回
      </Link>

      <div className="w-full max-w-sm">
        {/* Logo 区 */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/50 shadow-sm">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-xs font-medium tracking-widest text-muted-foreground/60 uppercase">临介社区</p>
            <h1 className="mt-1 text-xl font-semibold text-foreground">管理后台</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">仅限授权管理员访问</p>
          </div>
        </div>

        {/* 步骤指示器 */}
        <div className="mb-5 flex items-center justify-center gap-2">
          <StepDot active={step === 'invite'} done={step === 'credentials'} label="验证邀请码" num={1} />
          <div className="h-px w-8 bg-border" />
          <StepDot active={step === 'credentials'} done={false} label="账号登录" num={2} />
        </div>

        {/* 卡片 */}
        <div className="rounded-2xl border border-border/60 bg-background/85 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/70">

          {/* 步骤 1 */}
          {step === 'invite' && (
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              {inviteError && <ErrorBanner msg={inviteError} />}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">管理员邀请码</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                  <input
                    type="password"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="请输入邀请码"
                    autoComplete="off"
                    autoFocus
                    className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-all"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground/60">邀请码由超级管理员提供，区分大小写</p>
              </div>
              <button
                type="submit"
                disabled={inviteLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-all active:scale-[0.98]"
              >
                {inviteLoading ? <><Loader2 className="h-4 w-4 animate-spin" />验证中…</> : <>验证邀请码 →</>}
              </button>
            </form>
          )}

          {/* 步骤 2 */}
          {step === 'credentials' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && <ErrorBanner msg={loginError} />}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">管理员邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">密码</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-all"
                  />
                  <button type="button" onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setStep('invite'); setLoginError(''); }}
                  className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-all">
                  ← 返回
                </button>
                <button type="submit" disabled={loginLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-all active:scale-[0.98]">
                  {loginLoading ? <><Loader2 className="h-4 w-4 animate-spin" />登录中…</> : <><ShieldCheck className="h-4 w-4" />安全登录</>}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground/40 leading-relaxed px-2">
          此页面受到保护。所有登录尝试均被记录。
        </p>
      </div>
    </main>
  );
}

function StepDot({ active, done, label, num }: { active: boolean; done: boolean; label: string; num: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all
        ${done ? 'bg-primary/20 text-primary' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
        {done ? '✓' : num}
      </div>
      <span className={`text-[10px] transition-colors ${active ? 'text-foreground/70' : 'text-muted-foreground/40'}`}>{label}</span>
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />{msg}
    </div>
  );
}
