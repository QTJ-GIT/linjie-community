'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { MagneticButton } from '@/components/effects/MagneticButton';

export function LandingCta() {
  const router = useRouter();
  return (
    <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
      <MagneticButton
        ariaLabel="进入大厅"
        onClick={() => router.push('/feed')}
        className="group rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background shadow-[0_8px_30px_-8px] shadow-foreground/40 transition-shadow hover:shadow-foreground/50"
      >
        <span className="inline-flex items-center gap-2">
          进入大厅
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </MagneticButton>
    </div>
  );
}
