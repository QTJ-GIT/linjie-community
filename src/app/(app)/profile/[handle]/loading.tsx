import { Skeleton } from '@/components/ui/skeleton';

function PostCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-10/12" />
      </div>
    </div>
  );
}

export default function ProfileLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col items-start gap-4 rounded-lg border bg-card p-5 sm:flex-row sm:items-center">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-72" />
          <div className="flex gap-4 pt-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
      <div className="flex gap-3 border-b pb-2">
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-5 w-14" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
