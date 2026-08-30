import { SpeciesIcon } from '@/components/shared/SpeciesIcon';
import type { Combatant, EncounterState } from '@/lib/game/types';

type TurnOrderPanelProps = {
  encounter: EncounterState;
};

type QueueEntry = { combatant: Combatant; isNow: boolean };

/**
 * Predicts the *next* round's turn order without the engine's seeded RNG
 * (which only exists to break speed ties) -- same grouping as
 * computeOrder in src/lib/game/combat.ts (first-strikers first, both
 * groups sorted by spd descending) but with ties broken by id instead of
 * an RNG roll, since we can't/shouldn't consume the real seed just to
 * preview a UI list. Labeled as an estimate in the UI for that reason.
 */
function predictNextRoundOrder(combatants: Combatant[]): Combatant[] {
  const alive = combatants.filter((c) => c.currentHp > 0);
  const bySpdThenId = (a: Combatant, b: Combatant) => b.stats.spd - a.stats.spd || a.id.localeCompare(b.id);
  const firstStrikers = alive.filter((c) => c.effects.firstStrike).sort(bySpdThenId);
  const rest = alive.filter((c) => !c.effects.firstStrike).sort(bySpdThenId);
  return [...firstStrikers, ...rest];
}

function QueueRow({ combatant, isNow }: QueueEntry) {
  const sideClass =
    combatant.side === 'player'
      ? 'border-emerald-500 bg-emerald-950/40'
      : 'border-red-500 bg-red-950/40';
  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${sideClass} ${
        isNow ? 'ring-2 ring-indigo-400' : ''
      }`}
    >
      <SpeciesIcon name={combatant.name} emoji={combatant.emoji} size={20} className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium text-slate-100">{combatant.name}</span>
        <span className="text-[10px] text-slate-400">Lv{combatant.level}</span>
      </div>
      {isNow && <span className="shrink-0 text-[10px] font-semibold text-indigo-300">NOW</span>}
    </div>
  );
}

export function TurnOrderPanel({ encounter }: TurnOrderPanelProps) {
  const byId = new Map(encounter.combatants.map((c) => [c.id, c]));
  const thisRound = encounter.order
    .slice(encounter.orderIndex)
    .map((id) => byId.get(id))
    .filter((c): c is Combatant => !!c && c.currentHp > 0);

  const nextRound = predictNextRoundOrder(encounter.combatants);

  return (
    <div className="flex flex-col gap-3 lg:sticky lg:top-4">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Turn Order</p>
        <div className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {thisRound.map((c, idx) => (
            <div key={c.id} className="w-36 shrink-0 lg:w-auto">
              <QueueRow combatant={c} isNow={idx === 0} />
            </div>
          ))}
        </div>
      </div>
      {nextRound.length > 0 && (
        <div className="opacity-60">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Next round (est.)
          </p>
          <div className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {nextRound.map((c) => (
              <div key={c.id} className="w-36 shrink-0 lg:w-auto">
                <QueueRow combatant={c} isNow={false} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
