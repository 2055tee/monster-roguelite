import type { MonsterSpecies, OwnedMonster } from '@/lib/game/types';
import { Card } from '@/components/ui/Card';
import { StatBar } from '@/components/ui/StatBar';
import { HealingCountdown } from './HealingCountdown';
import { isHealingNow } from './rarity';

// Display-only approximation of max HP (base stat * rolled multiplier).
// The authoritative max-HP formula (including level scaling) lives in the
// game engine (src/lib/game/stats.ts, owned by another work package) and
// isn't exposed via HubView, so this is a reasonable UI-only estimate.
function approxMaxHp(monster: OwnedMonster, species: MonsterSpecies): number {
  return Math.round(species.baseStats.hp * monster.rolls.hp);
}

export function TeamSlotCard({
  slot,
  monster,
  species,
}: {
  slot: 0 | 1 | 2;
  monster: OwnedMonster | null;
  species: MonsterSpecies | null;
}) {
  if (!monster || !species) {
    return (
      <Card className="flex min-h-[120px] items-center justify-center text-sm text-slate-500">
        Slot {slot} — Empty
      </Card>
    );
  }

  const isHealing = isHealingNow(monster.healingUntil);
  const hpMax = approxMaxHp(monster, species);
  const hp = monster.currentHp ?? hpMax;

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-100">
          {species.emoji} {species.name}
        </span>
        <span className="text-xs text-slate-400">Lv {monster.level}</span>
      </div>
      {isHealing ? (
        <HealingCountdown healingUntil={monster.healingUntil as string} />
      ) : (
        <StatBar label="HP" value={hp} max={hpMax} colorClassName="bg-red-500" />
      )}
    </Card>
  );
}
