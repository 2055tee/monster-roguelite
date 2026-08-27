import { requireUser } from '@/server/auth';
import { getRunState } from '@/server/actions/run';
import { RunScreen } from '@/components/run/RunScreen';
import type { RunView } from '@/lib/game/types';

export default async function RunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  await requireUser();

  let initialView: RunView | null = null;
  let initialError: string | null = null;

  try {
    initialView = await getRunState(runId);
  } catch (err) {
    initialError = err instanceof Error ? err.message : 'Failed to load run.';
  }

  return (
    <RunScreen runId={runId} initialView={initialView} initialError={initialError} />
  );
}
