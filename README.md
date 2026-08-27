# Monster Roguelite

A solo-dev portfolio roguelite monster-catching web game. Built with Next.js (App
Router), TypeScript, Tailwind CSS v4, and Supabase (auth + Postgres).

This repo currently contains **WP0**: the foundation scaffold — auth, layout
shell, UI primitives, and frozen type/engine/server-action contracts that the
rest of the game is built against. See `CONTEXT.md` for the full design doc
and work-package breakdown.

## Getting started

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in your Supabase project's URL
and publishable key (already pre-filled in this repo's `.env.local` for the
project's own Supabase instance). The `SUPABASE_SERVICE_ROLE_KEY` must be
pasted in manually from the Supabase dashboard (Project Settings > API) —
it's not needed until WP3.

Open [http://localhost:3000](http://localhost:3000). Unauthenticated visitors
are redirected to `/login`, which supports sign-up, sign-in, and a one-click
demo account.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint
- `npm run test` — run Vitest (unit tests land in later work packages)

## Project structure

- `src/lib/game/types.ts` — frozen core game types shared across all packages
- `src/lib/game/*.ts` — game engine (rng, stats, abilities, combat, dungeon,
  catch, items) — stubbed in WP0, implemented in WP2
- `src/server/actions/*.ts` — server actions (hub, run, combat, catch) —
  stubbed in WP0, implemented in WP3
- `src/server/auth.ts` — `requireUser()` server helper
- `src/lib/supabase/{client,server,admin}.ts` — Supabase client factories
- `src/app/(game)/` — authenticated game shell (hub/run pages land in WP4/WP5)
- `src/components/ui/` — small Tailwind UI primitives (Button, Card, Panel,
  StatBar, Modal)

## Deploying

The easiest way to deploy is via [Vercel](https://vercel.com/new). See the
[Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying)
for details.
