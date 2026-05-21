import Link from 'next/link';
import Image from 'next/image';
import { Eye, PlayCircle, FileText } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { SmartTime } from '@/components/smart-time';
import type { TeachingResourceWithAuthor } from '@/types/domain';

export function TeachingCard({ resource }: { resource: TeachingResourceWithAuthor }) {
  const { id, type, title, description, cover_image_url, thumbnail_url, view_count, created_at, author, category } = resource;
  const cover = cover_image_url ?? thumbnail_url;
  const initials = (author.display_name ?? author.handle ?? '?').slice(0, 1);

  return (
    <Link
      href={`/teaching/${id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card transition-shadow hover:shadow-md"
    >
      {/* 封面 */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted/40">
        {cover ? (
          <Image
            src={cover}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            {type === 'video' ? (
              <PlayCircle className="h-12 w-12 text-muted-foreground/30" />
            ) : (
              <FileText className="h-12 w-12 text-muted-foreground/30" />
            )}
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1.5">
          <Badge
            variant={type === 'video' ? 'default' : 'secondary'}
            className="gap-1 text-[11px]"
          >
            {type === 'video' ? (
              <PlayCircle className="h-3 w-3" />
            ) : (
              <FileText className="h-3 w-3" />
            )}
            {type === 'video' ? '视频' : '文章'}
          </Badge>
          {category ? (
            <Badge variant="outline" className="text-[11px] bg-background/80 backdrop-blur">
              {category}
            </Badge>
          ) : null}
        </div>
      </div>

      {/* 内容 */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-[hsl(var(--brand-600))] dark:group-hover:text-[hsl(var(--brand-400))]">
          {title}
        </h3>
        {description ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              {author.avatar_url ? (
                <AvatarImage src={author.avatar_url} alt={author.display_name} />
              ) : null}
              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{author.display_name}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {view_count}
            </span>
            <SmartTime iso={created_at} className="font-mono text-[10px]" />
          </div>
        </div>
      </div>
    </Link>
  );
}
