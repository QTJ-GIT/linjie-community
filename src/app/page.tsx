import Link from 'next/link';
import { ArrowRight, MessageSquare, Sparkles, TrendingUp } from 'lucide-react';
import { Aurora } from '@/components/effects/Aurora';
import { GradientText } from '@/components/effects/GradientText';
import { Typewriter } from '@/components/effects/Typewriter';
import { ScrollReveal, ScrollRevealItem } from '@/components/effects/ScrollReveal';
import { NumberTicker } from '@/components/effects/NumberTicker';
import { GlassPanel } from '@/components/effects/GlassPanel';
import { Logo } from '@/components/shell/Logo';
import { LandingCta } from '@/components/landing/LandingCta';

export const metadata = {
  title: '临介社区 · 投资者的安静角落',
};

const FEATURES = [
  {
    icon: MessageSquare,
    title: '认真的讨论',
    desc: '帖子、问答、评论树。带 cashtag 的提及自动联通到股票频道。',
  },
  {
    icon: TrendingUp,
    title: '股票频道',
    desc: '每只股票独立讨论流和聊天室，盯盘聊行情两不误。',
  },
  {
    icon: Sparkles,
    title: '克制的体验',
    desc: '亮色为主、动效有度。专注阅读和交流，不做信息流广告。',
  },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* ========== Hero ========== */}
      <section className="relative isolate flex min-h-[92vh] flex-col">
        {/* aurora 背景 —— 移动端弱化为静态渐变 */}
        <div className="absolute inset-0 -z-10">
          <div className="hidden md:block">
            <Aurora intensity={0.55} />
          </div>
          <div className="absolute inset-0 bg-brand-gradient-soft opacity-70 md:hidden" />
          {/* 顶部渐隐过渡到下方 background */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
        </div>

        {/* 顶栏 */}
        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <Logo full size={28} />
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              登录
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-foreground px-3 py-1.5 font-medium text-background transition-opacity hover:opacity-90"
            >
              注册
            </Link>
          </nav>
        </header>

        {/* 主标题区 */}
        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500">
              <span className="absolute inset-0 -m-0.5 animate-ping rounded-full bg-emerald-500/60" />
            </span>
            实时讨论 · 在线
          </div>

          <h1 className="text-h1 font-bold leading-[1.05] tracking-tight sm:text-display">
            <GradientText
              animate
              gradientClassName="from-[hsl(var(--brand-500))] via-[hsl(var(--brand-accent-500))] to-[hsl(var(--brand-500))]"
              as="span"
            >
              临介社区
            </GradientText>
            <span className="block mt-3 text-foreground/90 text-h2 font-semibold sm:text-h1">
              投资者的安静角落
            </span>
          </h1>

          <div className="text-body-lg text-muted-foreground">
            <Typewriter
              lines={[
                '一个可以聊 $AAPL 的地方',
                '帖子、问答、实时聊天',
                '没有热搜，没有广告，没有打扰',
              ]}
              cursorClassName="bg-[hsl(var(--brand-500))]"
            />
          </div>

          <LandingCta />

          {/* 数据小条 */}
          <div className="mt-6 flex items-center gap-8 text-sm">
            <div className="flex flex-col items-center">
              <NumberTicker
                to={3200}
                className="text-2xl font-semibold text-foreground"
              />
              <span className="text-xs text-muted-foreground mt-0.5">注册用户</span>
            </div>
            <div className="h-8 w-px bg-border/70" />
            <div className="flex flex-col items-center">
              <NumberTicker
                to={1480}
                suffix="+"
                className="text-2xl font-semibold text-foreground"
              />
              <span className="text-xs text-muted-foreground mt-0.5">活跃讨论</span>
            </div>
            <div className="h-8 w-px bg-border/70" />
            <div className="flex flex-col items-center">
              <NumberTicker
                to={12}
                className="text-2xl font-semibold text-foreground"
              />
              <span className="text-xs text-muted-foreground mt-0.5">股票频道</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========== Features ========== */}
      <section className="relative mx-auto max-w-6xl px-6 py-20">
        <ScrollReveal as="div" className="mb-12 max-w-2xl">
          <ScrollRevealItem>
            <p className="text-sm font-medium uppercase tracking-widest text-[hsl(var(--brand-500))]">
              特性
            </p>
          </ScrollRevealItem>
          <ScrollRevealItem className="mt-3">
            <h2 className="text-h2 font-semibold tracking-tight sm:text-h1">
              一个为长内容和深度讨论而设的小型社区。
            </h2>
          </ScrollRevealItem>
          <ScrollRevealItem className="mt-3">
            <p className="text-body text-muted-foreground">
              带情绪标签的帖子、嵌套评论、实时聊天、cashtag、问答采纳——
              把投资者的日常对话归到一处，安静、好读。
            </p>
          </ScrollRevealItem>
        </ScrollReveal>

        <ScrollReveal as="ul" className="grid gap-4 sm:grid-cols-3" stagger={0.08}>
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <ScrollRevealItem
                key={f.title}
                as="li"
                className="group relative h-full"
              >
                <GlassPanel className="h-full p-6 transition-shadow duration-300 hover:shadow-md">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-gradient-soft text-[hsl(var(--brand-500))]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-h3 font-semibold tracking-tight">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {f.desc}
                  </p>
                </GlassPanel>
              </ScrollRevealItem>
            );
          })}
        </ScrollReveal>
      </section>

      {/* ========== Closing CTA ========== */}
      <section className="relative mx-auto max-w-3xl px-6 pb-24 pt-8 text-center">
        <ScrollReveal>
          <ScrollRevealItem>
            <h2 className="text-h2 font-semibold tracking-tight">
              来加入第一批早起讨论的人。
            </h2>
          </ScrollRevealItem>
          <ScrollRevealItem className="mt-3">
            <p className="text-sm text-muted-foreground">
              无需邀请码，注册即可发帖、回帖、订阅股票频道。
            </p>
          </ScrollRevealItem>
          <ScrollRevealItem className="mt-6 inline-flex">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              创建账号
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </ScrollRevealItem>
        </ScrollReveal>
      </section>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} 临介社区
      </footer>
    </main>
  );
}
