import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';

/**
 * Fetches the current authenticated user from Supabase using the server
 * client. Redirects to /login if no user is present. Use this at the top
 * of server components / server actions that require an authenticated user.
 */
export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}
