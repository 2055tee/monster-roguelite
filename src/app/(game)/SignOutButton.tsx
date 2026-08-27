'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setLoading(false);
    router.push('/login');
    router.refresh();
  }

  return (
    <Button variant="ghost" onClick={handleSignOut} disabled={loading}>
      {loading ? 'Signing out…' : 'Sign out'}
    </Button>
  );
}
