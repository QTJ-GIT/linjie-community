import { Skeleton } from '@/components/ui/skeleton';

function MessageSkeleton({ mine = false }: { mine?: boolean }) {
  return (
    <div className={mine ? 'flex justify-end gap-2' : 'flex gap-2'}>
      {!mine ? <Skeleton className="h-8 w-8 shrink-0 rounded-full" /> : null}
      <div className={mine ? 'max-w-[70%] space-y-2 text-right' : 'max-w-[70%] space-y-2'}>
        {!mine ? <Skeleton className="h-3 w-20" /> : null}
        <Skeleton className={mine ? 'ml-auto h-8 w-40 rounded-2xl' : 'h-8 w-52 rounded-2xl'} />
      </div>
      {mine ? <Skeleton className="h-8 w-8 shrink-0 rounded-full" /> : null}
    </div>
  );
}

export default function ChatRoomLoading() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-hidden p-4">
        <MessageSkeleton />
        <MessageSkeleton mine />
        <MessageSkeleton />
        <MessageSkeleton />
        <MessageSkeleton mine />
        <MessageSkeleton />
      </div>
      <div className="border-t p-3">
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}
