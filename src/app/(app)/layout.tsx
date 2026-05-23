import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/shell/Navbar';
import { Sidebar } from '@/components/shell/Sidebar';
import { ActiveUsersPanel } from '@/components/shell/ActiveUsersPanel';
import { PageTransition } from '@/components/transitions/PageTransition';
import { ScrollToTop } from '@/components/shell/ScrollToTop';
import { HeartbeatTicker } from '@/components/shell/HeartbeatTicker';
import { SupportWidget } from '@/components/support/SupportWidget';
import { getSectionTree } from '@/lib/sections';

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = createClient();
  const [
    {
      data: { user },
    },
    sectionTree,
  ] = await Promise.all([supabase.auth.getUser(), getSectionTree()]);
  const isSignedIn = !!user;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar isSignedIn={isSignedIn} />
      <div className="mx-auto flex w-full max-w-7xl gap-8 px-4">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[208px] shrink-0 overflow-y-auto border-r border-border/60 pr-3 md:block">
          <Sidebar
            sectionTree={sectionTree}
            activeUsersSlot={isSignedIn ? <ActiveUsersPanel /> : null}
          />
        </aside>
        <main className="min-w-0 flex-1 py-6">
          <div className="mx-auto w-full max-w-3xl">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[240px] shrink-0 py-6 lg:block">
          {/* optional right gutter for future widgets */}
        </aside>
      </div>
      <ScrollToTop />
      {user ? <HeartbeatTicker /> : null}
      <SupportWidget />
    </div>
  );
}
