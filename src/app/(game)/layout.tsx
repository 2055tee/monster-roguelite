import type { ReactNode } from 'react';

import { requireUser } from '@/server/auth';
import { SignOutButton } from './SignOutButton';

export default async function GameLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold">Monster Roguelite</span>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-amber-300">
            🪙 —
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">{user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
