import type { Item, MonsterSpecies, OwnedMonster } from '@/lib/game/types';
import { effectiveStats } from '@/lib/game/stats';
import { SpeciesIcon } from '@/components/shared/SpeciesIcon';
import { Card } from '@/components/ui/Card';
import { StatBar } from '@/components/ui/StatBar';
import { XpBar } from '@/components/ui/XpBar';
import { HealingCountdown } from './HealingCountdown';
import { isHealingNow } from './rarity';

export function TeamSlotCard({
  slot,
  monster,
  species,
  equippedItem,
  equippedReforgeLevel = 0,
}: {
  slot: 0 | 1 | 2;
  monster: OwnedMonster | null;
  species: MonsterSpecies | null;
  equippedItem: Item | null;
  equippedReforgeLevel?: number;
}) {
  if (!monster || !species) {
    return (
      <Card className="flex min-h-[120px] items-center justify-center text-sm text-slate-500">
        Slot {slot} — Empty
      </Card>
    );
  }

  const isHealing = isHealingNow(monster.healingUntil);
  const hpMax = effectiveStats(species, monster, equippedItem, equippedReforgeLevel).hp;
  const hp = monster.currentHp ?? hpMax;

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-100">
          <SpeciesIcon name={species.name} emoji={species.emoji} size={28} />
          {species.name}
        </span>
      </div>
      <XpBar level={monster.level} xp={monster.xp} />
      {isHealing ? (
        <HealingCountdown healingUntil={monster.healingUntil as string} />
      ) : (
        <StatBar label="HP" value={hp} max={hpMax} colorClassName="bg-red-500" />
      )}
    </Card>
  );
}
