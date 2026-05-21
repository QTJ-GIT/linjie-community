import { Skeleton } from '@/components/ui/skeleton';

export default function TickersLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-7 w-32" />
      </div>

      {Array.from({ length: 2 }).map((_, s) => (
        <section key={s} className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-14" />
                  <Skeleton className="h-4 w-10 rounded" />
                </div>
                <Skeleton className="mt-2 h-3 w-3/4" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
