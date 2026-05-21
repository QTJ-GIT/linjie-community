import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { FileText, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { SITE } from '@/lib/site';
import type { PostSentiment, PostWithAuthor, Profile, SectionSlug } from '@/types/domain';
import { PostCard } from '@/components/posts/PostCard';
import { SmartTime } from '@/components/smart-time';
import { EmptyState } from '@/components/empty-state';
import { ProfileHero } from '@/components/profile/ProfileHero';
import { ProfileStats } from '@/components/profile/ProfileStats';
import {
  ProfileTabs,
  parseProfileTab,
  type ProfileTabKey,
} from '@/components/profile/ProfileTabs';

type PageProps = {
  params: { handle: string };
  searchParams?: { tab?: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('handle, display_name, bio')
    .ilike('handle', params.handle)
    .maybeSingle();

  const row = (profile ?? null) as { handle: string; display_name: string; bio: string | null } | null;
  if (!row) {
    return { title: `用户 · ${SITE.name}` };
  }
  const title = `${row.display_name} (@${row.handle}) · ${SITE.name}`;
  const description = (row.bio ?? '').trim() || `${row.display_name} 在 ${SITE.name} 的个人主页`;
  const url = `${SITE.url}/profile/${row.handle}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'profile',
      siteName: SITE.name,
      locale: SITE.locale,
    },
    twitter: { card: 'summary', title, description },
  };
}

type RecentPostRow = {
  id: string;
  author_id: string;
  section_slug: SectionSlug;
  type: 'post' | 'question';
  title: string;
  body_json: Record<string, unknown>;
  body_text: string;
  accepted_answer_id: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  score: number;
  sentiment: PostSentiment | null;
  is_pinned: boolean | null;
  post_tickers: { symbol: string }[] | null;
};

type RecentCommentRow = {
  id: string;
  body_text: string;
  created_at: string;
  post_id: string;
  post: { id: string; title: string } | { id: string; title: string }[] | null;
};

export default async function ProfileByHandlePage({
  params,
  searchParams,
}: PageProps) {
  const supabase = createClient();
  const tab: ProfileTabKey = parseProfileTab(searchParams?.tab);

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, handle, display_name, avatar_url, bio, created_at, updated_at')
    .ilike('handle', params.handle)
    .maybeSingle<Profile>();

  if (!profile) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isSelf = user?.id === profile.id;

  // 并行：counts + karma + follow 关系。tab 内容稍后再单独取，避免在 about tab 上无谓拉数据。
  const [
    { count: postCount },
    { count: commentCount },
    karmaRes,
    followRowRes,
    { count: followerCount },
  ] = await Promise.all([
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', profile.id)
      .eq('is_deleted', false),
    supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', profile.id)
      .eq('is_deleted', false),
    supabase
      .from('user_karma')
      .select('karma')
      .eq('user_id', profile.id)
      .maybeSingle(),
    user && user.id !== profile.id
      ? supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('following_id', profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null as null | { follower_id: string } }),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profile.id),
  ]);

  const karma = (karmaRes.data as { karma?: number } | null)?.karma ?? 0;
  const initiallyFollowing = !!followRowRes.data;

  // tab 内容
  let recentPosts: PostWithAuthor[] = [];
  let recentComments: Array<{
    id: string;
    body_text: string;
    created_at: string;
    post_id: string;
    post_title: string;
  }> = [];

  if (tab === 'posts') {
    const { data: rows } = await supabase
      .from('posts')
      .select(
        `id, author_id, section_slug, type, title, body_json, body_text,
         accepted_answer_id, is_deleted, created_at, updated_at, score, sentiment, is_pinned,
         post_tickers ( symbol )`
      )
      .eq('author_id', profile.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(20);

    const authorEmbed = {
      id: profile.id,
      handle: profile.handle,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
    };
    recentPosts = ((rows ?? []) as RecentPostRow[]).map((p) => ({
      id: p.id,
      author_id: p.author_id,
      section_slug: p.section_slug,
      type: p.type,
      title: p.title,
      body_json: p.body_json,
      body_text: p.body_text,
      accepted_answer_id: p.accepted_answer_id,
      is_deleted: p.is_deleted,
      created_at: p.created_at,
      updated_at: p.updated_at,
      score: p.score ?? 0,
      sentiment: p.sentiment ?? null,
      is_pinned: !!p.is_pinned,
      author: authorEmbed,
      tickers: (p.post_tickers ?? []).map((t) => t.symbol),
    }));
  } else if (tab === 'comments') {
    const { data: rows } = await supabase
      .from('comments')
      .select(
        `id, body_text, created_at, post_id,
         post:posts ( id, title )`
      )
      .eq('author_id', profile.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(20);

    recentComments = ((rows ?? []) as RecentCommentRow[]).map((c) => {
      const postEmbed = Array.isArray(c.post) ? c.post[0] ?? null : c.post;
      return {
        id: c.id,
        body_text: c.body_text,
        created_at: c.created_at,
        post_id: c.post_id,
        post_title: postEmbed?.title ?? '已删除的帖子',
      };
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <ProfileHero
        profile={profile}
        isSelf={isSelf}
        currentUserId={user?.id ?? null}
        initiallyFollowing={initiallyFollowing}
        followerCount={followerCount ?? 0}
      />

      <ProfileStats
        karma={karma}
        postCount={postCount ?? 0}
        commentCount={commentCount ?? 0}
        followerCount={followerCount ?? 0}
      />

      <ProfileTabs handle={profile.handle} active={tab} />

      {tab === 'posts' ? (
        recentPosts.length > 0 ? (
          <section className="overflow-hidden rounded-2xl border border-border/60 bg-card divide-y divide-border/60">
            {recentPosts.map((post) => (
              <PostCard key={post.id} post={post} mode="compact" />
            ))}
          </section>
        ) : (
          <EmptyState
            icon={FileText}
            title="还没有发过帖子"
            {...(isSelf ? { action: { label: '去发布', href: '/posts/new' } } : {})}
          />
        )
      ) : null}

      {tab === 'comments' ? (
        recentComments.length > 0 ? (
          <section className="space-y-3">
            {recentComments.map((c) => (
              <article
                key={c.id}
                className="rounded-xl border border-border/60 bg-card px-4 py-3 transition-colors hover:border-border"
              >
                <p className="line-clamp-3 text-sm leading-relaxed">{c.body_text}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span>回复</span>
                  <Link
                    href={`/posts/${c.post_id}`}
                    className="line-clamp-1 max-w-[60%] font-medium text-foreground hover:text-primary"
                  >
                    {c.post_title}
                  </Link>
                  <span aria-hidden className="text-muted-foreground/50">
                    ·
                  </span>
                  <SmartTime iso={c.created_at} />
                </div>
              </article>
            ))}
          </section>
        ) : (
          <EmptyState icon={MessageSquare} title="还没有发过评论" />
        )
      ) : null}

      {tab === 'about' ? (
        <section className="space-y-5 rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
          <div>
            <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">
              自我介绍
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {profile.bio?.trim() ? profile.bio : '还没写自我介绍'}
            </p>
          </div>
          <div className="border-t border-border/60 pt-4">
            <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">
              加入时间
            </h2>
            <p className="mt-2 text-sm text-foreground/90">
              {new Date(profile.created_at).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
