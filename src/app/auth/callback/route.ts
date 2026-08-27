import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

// Handles the OAuth/email-confirmation redirect from Supabase Auth,
// exchanging the `code` query param for a session cookie.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/hub';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
