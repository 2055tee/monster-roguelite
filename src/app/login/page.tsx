'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/client';

const DEMO_EMAIL = 'demo@monsterroguelite.dev';
const DEMO_PASSWORD = 'DemoPass123!';

type Mode = 'sign_in' | 'sign_up';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const supabase = createClient();

    if (mode === 'sign_in') {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push('/hub');
      router.refresh();
    } else {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      setLoading(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      setInfo('Account created. If email confirmation is required, check your inbox — otherwise you can sign in now.');
      setMode('sign_in');
    }
  }

  async function handleDemoLogin() {
    setLoading(true);
    setError(null);
    setInfo(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push('/hub');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-lg font-bold text-slate-100">Monster Roguelite</h1>
        <p className="mb-4 text-sm text-slate-400">
          {mode === 'sign_in' ? 'Sign in to continue' : 'Create an account'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
              autoComplete="email"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
              autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'}
            />
          </label>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {info ? <p className="text-sm text-emerald-400">{info}</p> : null}

          <Button type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'sign_in' ? 'Sign in' : 'Sign up'}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in');
            setError(null);
            setInfo(null);
          }}
          className="mt-3 text-sm text-indigo-400 hover:underline"
        >
          {mode === 'sign_in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>

        <div className="my-4 flex items-center gap-2 text-xs text-slate-500">
          <div className="h-px flex-1 bg-slate-700" />
          or
          <div className="h-px flex-1 bg-slate-700" />
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={loading}
          onClick={handleDemoLogin}
        >
          Try demo account
        </Button>
      </Card>
    </main>
  );
}
