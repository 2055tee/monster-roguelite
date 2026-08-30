import type { Dungeon, MonsterSpecies } from '@/lib/game/types';
import { SpeciesIcon } from '@/components/shared/SpeciesIcon';
import { Card } from '@/components/ui/Card';
import { EnterDungeonButton } from './EnterDungeonButton';

export function DungeonCard({
  dungeon,
  bossSpecies,
  disabled,
  disabledReason,
}: {
  dungeon: Dungeon;
  bossSpecies: MonsterSpecies | null;
  disabled: boolean;
  disabledReason?: string;
}) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-100">{dungeon.name}</span>
        <span className="rounded-full bg-indigo-900 px-2 py-0.5 text-xs text-indigo-300">
          Tier {dungeon.difficultyTier}
        </span>
      </div>
      <p className="text-xs text-slate-400">Enemy Lv {dungeon.enemyLevel}</p>
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <SpeciesIcon name={bossSpecies?.name ?? ''} emoji={bossSpecies?.emoji ?? '❓'} size={28} />
        <span>Boss: {bossSpecies?.name ?? dungeon.bossSpeciesId}</span>
      </div>
      <p className="text-xs text-amber-300">🪙 {dungeon.goldReward} reward</p>
      <EnterDungeonButton dungeonId={dungeon.id} disabled={disabled} disabledReason={disabledReason} />
    </Card>
  );
}
