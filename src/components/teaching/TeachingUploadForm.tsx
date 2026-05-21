'use client';

import * as React from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Upload, Link2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TiptapEditorLazy } from '@/components/editor/TiptapEditorLazy';
import { uploadTeachingVideo, uploadPostImage } from '@/lib/upload';
import { createTeachingResource } from '@/actions/teaching';
import type { TeachingCreateInput } from '@/actions/teaching';

// ── 预设分类 ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  '股票入门',
  '技术分析',
  '基本面分析',
  '投资策略',
  '交易心理',
  '工具教程',
] as const;

// ── Embed URL resolver ────────────────────────────────────────────────────
function resolveEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // Bilibili
    if (u.hostname.includes('bilibili.com')) {
      const bvMatch = u.pathname.match(/\/(BV[\w]+)/i);
      if (bvMatch) return `//player.bilibili.com/player.html?bvid=${bvMatch[1]}&autoplay=0`;
      return null;
    }
    // YouTube youtu.be
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    // YouTube full
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      return null;
    }
    // 腾讯视频
    if (u.hostname.includes('v.qq.com')) {
      const vidMatch = url.match(/\/([a-z0-9]+)\.html/i);
      if (vidMatch) return `https://v.qq.com/txp/iframe/player.html?vid=${vidMatch[1]}`;
      return null;
    }
    // Generic — return as-is (user may have a direct embed URL)
    return url;
  } catch {
    return null;
  }
}

function isEmptyDoc(json: Record<string, unknown> | null): boolean {
  if (!json || typeof json !== 'object') return true;
  const content = (json as { content?: unknown[] }).content;
  if (!Array.isArray(content) || content.length === 0) return true;
  if (content.length === 1) {
    const first = content[0] as { type?: string; content?: unknown[] } | undefined;
    if (first?.type === 'paragraph' && (!first.content || first.content.length === 0)) {
      return true;
    }
  }
  return false;
}

// ── Main form ─────────────────────────────────────────────────────────────
export function TeachingUploadForm({ userId }: { userId: string }) {
  const [topTab, setTopTab] = React.useState<'video' | 'article'>('video');
  const [videoTab, setVideoTab] = React.useState<'upload' | 'link'>('upload');

  // shared
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [coverPreview, setCoverPreview] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // video
  const [videoFile, setVideoFile] = React.useState<File | null>(null);
  const [videoUploading, setVideoUploading] = React.useState(false);
  const [embedInput, setEmbedInput] = React.useState('');

  // article
  const [bodyJson, setBodyJson] = React.useState<Record<string, unknown> | null>(null);
  const [bodyText, setBodyText] = React.useState('');

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setCoverFile(f);
    setCoverPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error('请填写标题'); return; }

    setSubmitting(true);
    try {
      let coverUrl: string | undefined;
      if (coverFile) coverUrl = await uploadPostImage(coverFile);

      let input: TeachingCreateInput;

      if (topTab === 'video') {
        let videoUrl: string | undefined;
        let resolvedEmbed: string | undefined;

        if (videoTab === 'upload') {
          if (!videoFile) { toast.error('请选择要上传的视频文件'); setSubmitting(false); return; }
          setVideoUploading(true);
          toast.info('视频上传中，请稍候…');
          videoUrl = await uploadTeachingVideo(userId, videoFile);
        } else {
          if (!embedInput.trim()) { toast.error('请填写视频链接'); setSubmitting(false); return; }
          const resolved = resolveEmbedUrl(embedInput.trim());
          if (!resolved) { toast.error('无法解析该视频链接，请检查格式'); setSubmitting(false); return; }
          resolvedEmbed = resolved;
        }

        input = {
          type: 'video',
          title: title.trim(),
          description: description.trim() || undefined,
          video_url: videoUrl,
          embed_url: resolvedEmbed,
          cover_image_url: coverUrl,
          category: category || undefined,
        };
      } else {
        if (isEmptyDoc(bodyJson)) { toast.error('文章内容不能为空'); setSubmitting(false); return; }
        input = {
          type: 'article',
          title: title.trim(),
          description: description.trim() || undefined,
          body_json: bodyJson!,
          body_text: bodyText,
          cover_image_url: coverUrl,
          category: category || undefined,
        };
      }

      const result = await createTeachingResource(input);
      if (!result?.ok) {
        toast.error(result?.error ?? '发布失败');
      }
      // on success, createTeachingResource redirects → no further action needed
    } catch (err) {
      const msg = err instanceof Error ? err.message : '发布失败';
      toast.error(msg);
    } finally {
      setVideoUploading(false);
      setSubmitting(false);
    }
  }

  React.useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 内容类型 */}
      <Tabs value={topTab} onValueChange={(v) => setTopTab(v as 'video' | 'article')}>
        <TabsList className="w-full">
          <TabsTrigger value="video" className="flex-1">视频</TabsTrigger>
          <TabsTrigger value="article" className="flex-1">文章</TabsTrigger>
        </TabsList>

        {/* ── 视频 Tab ── */}
        <TabsContent value="video" className="space-y-4 pt-2">
          <Tabs value={videoTab} onValueChange={(v) => setVideoTab(v as 'upload' | 'link')}>
            <TabsList>
              <TabsTrigger value="upload" className="gap-2"><Upload className="h-3.5 w-3.5" />上传文件</TabsTrigger>
              <TabsTrigger value="link" className="gap-2"><Link2 className="h-3.5 w-3.5" />外部链接</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="pt-3">
              {videoFile ? (
                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{videoFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <button type="button" onClick={() => setVideoFile(null)} className="shrink-0 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border/60 bg-muted/20 px-6 py-10 transition-colors hover:border-primary/50 hover:bg-muted/40">
                  <Upload className="h-8 w-8 text-muted-foreground/50" />
                  <span className="text-sm text-muted-foreground">点击选择视频文件</span>
                  <span className="text-xs text-muted-foreground/60">MP4 / WebM / MOV，最大 500 MB</span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime"
                    className="sr-only"
                    onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
              {videoUploading ? (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  视频上传中…
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="link" className="pt-3 space-y-2">
              <Label htmlFor="embed-input">视频链接</Label>
              <Input
                id="embed-input"
                placeholder="粘贴 B站 / YouTube / 腾讯视频 链接"
                value={embedInput}
                onChange={(e) => setEmbedInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                支持：bilibili.com、youtube.com、youtu.be、v.qq.com
              </p>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ── 文章 Tab ── */}
        <TabsContent value="article" className="pt-2">
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <TiptapEditorLazy
              value={bodyJson}
              onChange={(json, text) => { setBodyJson(json); setBodyText(text); }}
              placeholder="在这里写文章内容…"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* 标题 */}
      <div className="space-y-2">
        <Label htmlFor="title">标题 *</Label>
        <Input
          id="title"
          placeholder="给内容起一个吸引人的标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
        />
      </div>

      {/* 分类 */}
      <div className="space-y-2">
        <Label htmlFor="category">分类</Label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-all"
        >
          <option value="">请选择分类</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* 简介 */}
      <div className="space-y-2">
        <Label htmlFor="description">简介（可选）</Label>
        <Input
          id="description"
          placeholder="一句话介绍内容…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
        />
      </div>

      {/* 封面图 */}
      <div className="space-y-2">
        <Label>封面图（可选）</Label>
        {coverPreview ? (
          <div className="relative w-48 aspect-video">
            <Image src={coverPreview} alt="封面预览" fill className="rounded-lg object-cover border border-border/60" unoptimized />
            <button
              type="button"
              onClick={() => { setCoverFile(null); setCoverPreview(null); }}
              className="absolute -right-2 -top-2 rounded-full bg-background shadow border p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <label className="flex w-48 cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-5 text-xs text-muted-foreground hover:border-primary/40 hover:bg-muted/40">
            <Upload className="h-5 w-5 opacity-50" />
            点击上传封面图
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handleCoverChange} />
          </label>
        )}
      </div>

      {/* 提交 */}
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={submitting} className="gap-2 px-8">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          发布
        </Button>
      </div>
    </form>
  );
}
