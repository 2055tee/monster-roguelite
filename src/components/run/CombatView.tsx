'use client';

import { useEffect, useRef, useState } from 'react';

import { SpeciesIcon } from '@/components/shared/SpeciesIcon';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { StatBar } from '@/components/ui/StatBar';
import { getAbility } from '@/lib/game/abilities';
import { estimateDamageRange } from '@/lib/game/combat';
import { submitCombatAction } from '@/server/actions/combat';
import { TurnOrderPanel } from './TurnOrderPanel';
import type { Combatant, EncounterState, RunView } from '@/lib/game/types';

const DAMAGE_KINDS = new Set(['damage', 'damage_first_strike', 'damage_poison']);

type CombatViewProps = {
  runId: string;
  view: RunView;
  encounter: EncounterState;
  busy: boolean;
  runAction: <T>(fn: () => Promise<T>) => Promise<T | null>;
  onView: (view: RunView) => void;
  onRoomCleared: () => void;
};

export function CombatView({
  runId,
  view,
  encounter,
  busy,
  runAction,
  onView,
  onRoomCleared,
}: CombatViewProps) {
  const [pendingAbility, setPendingAbility] = useState<string | null>(null);
  const [focusedAbility, setFocusedAbility] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: 'end' });
  }, [view.log.length]);

  const enemies = encounter.combatants.filter((c) => c.side === 'enemy');
  const players = encounter.combatants.filter((c) => c.side === 'player');
  const allEnemiesDead = enemies.length > 0 && enemies.every((c) => c.currentHp <= 0);
  const activeId = encounter.order[encounter.orderIndex];
  const activeCombatant = encounter.combatants.find((c) => c.id === activeId) ?? null;
  const isPlayerTurn = !allEnemiesDead && activeCombatant?.side === 'player' && activeCombatant.currentHp > 0;
  const aliveEnemies = enemies.filter((c) => c.currentHp > 0);
  // Reference target for showing an ability's damage range before a target is
  // picked: the same weakest-HP enemy the AI/UI already treats as the default.
  const referenceEnemy =
    aliveEnemies.length > 0
      ? aliveEnemies.reduce((a, b) => (a.currentHp <= b.currentHp ? a : b))
      : null;

  async function handleAbilityClick(actor: Combatant, abilityId: string) {
    const def = getAbility(abilityId);
    if (DAMAGE_KINDS.has(def.kind) || def.kind === 'heal_ally') {
      setPendingAbility(abilityId);
      return;
    }
    // self_heal_shield, team_buff_atk, or anything else with no explicit target -> target self
    await submit(actor.id, abilityId, actor.id);
  }

  async function handleTargetClick(actor: Combatant, targetId: string) {
    if (!pendingAbility) return;
    const abilityId = pendingAbility;
    setPendingAbility(null);
    await submit(actor.id, abilityId, targetId);
  }

  async function submit(actorId: string, abilityId: string, targetId: string) {
    const result = await runAction(() =>
      submitCombatAction(runId, { actorId, abilityId, targetId })
    );
    if (result) {
      onView(result.view);
    }
  }

  function renderRow(combatant: Combatant, isTarget: boolean, onTargetClick?: () => void) {
    const isActive = combatant.id === activeId && combatant.currentHp > 0;
    const isDead = combatant.currentHp <= 0;
    return (
      <div
        key={combatant.id}
        onClick={isTarget && !isDead ? onTargetClick : undefined}
        className={`rounded-md border p-3 transition-colors ${
          isDead
            ? 'border-slate-800 bg-slate-900/50 opacity-50'
            : isActive
              ? 'border-indigo-400 bg-indigo-950/40 ring-2 ring-indigo-400'
              : 'border-slate-700 bg-slate-800/60'
        } ${isTarget && !isDead ? 'cursor-pointer hover:ring-2 hover:ring-amber-400' : ''}`}
      >
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1.5">
            <SpeciesIcon name={combatant.name} emoji={combatant.emoji} size={22} />
            {combatant.name}{' '}
            <span className="text-xs text-slate-400">Lv{combatant.level}</span>
          </span>
          {isDead && <span className="text-xs font-semibold text-red-400">FAINTED</span>}
        </div>
        <StatBar
          label="HP"
          value={Math.max(0, combatant.currentHp)}
          max={combatant.stats.hp}
          colorClassName={isDead ? 'bg-slate-600' : 'bg-emerald-500'}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 p-4 lg:grid-cols-[13rem_1fr]">
      <TurnOrderPanel encounter={encounter} />

      <div className="flex flex-col gap-4">
      {allEnemiesDead && (
        <div className="rounded-md border border-emerald-500 bg-emerald-900/30 p-4 text-center">
          <p className="mb-3 text-lg font-semibold text-emerald-300">Room Cleared!</p>
          <Button onClick={onRoomCleared} disabled={busy}>
            Continue
          </Button>
        </div>
      )}

      <Panel title="Enemies">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {enemies.map((c) =>
            renderRow(
              c,
              !allEnemiesDead && !!pendingAbility && !!activeCombatant && DAMAGE_KINDS.has(getAbility(pendingAbility).kind),
              () => activeCombatant && handleTargetClick(activeCombatant, c.id)
            )
          )}
        </div>
      </Panel>

      <Panel title="Your Team">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {players.map((c) =>
            renderRow(
              c,
              !allEnemiesDead && !!pendingAbility && !!activeCombatant && getAbility(pendingAbility).kind === 'heal_ally',
              () => activeCombatant && handleTargetClick(activeCombatant, c.id)
            )
          )}
        </div>
      </Panel>

      {!allEnemiesDead && (
        <Panel title={isPlayerTurn && activeCombatant ? `${activeCombatant.name}'s Turn` : 'Enemy acting...'}>
          {isPlayerTurn && activeCombatant ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between rounded-md bg-slate-800 p-2 text-sm text-slate-300">
                {pendingAbility ? (
                  <>
                    <span>
                      Select a target for <strong>{getAbility(pendingAbility).name}</strong>...
                    </span>
                    <Button variant="ghost" onClick={() => setPendingAbility(null)} disabled={busy}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <span>Select a skill to use.</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {activeCombatant.abilities.map((abilityId) => {
                  const def = getAbility(abilityId);
                  const cooldown = activeCombatant.cooldowns[abilityId] ?? 0;
                  const disabled = busy || cooldown > 0;
                  const isPending = abilityId === pendingAbility;
                  const dmg = referenceEnemy ? estimateDamageRange(activeCombatant, abilityId, referenceEnemy) : null;
                  return (
                    <Button
                      key={abilityId}
                      variant="secondary"
                      disabled={disabled}
                      className={isPending ? 'ring-2 ring-amber-400' : ''}
                      onMouseEnter={() => setFocusedAbility(abilityId)}
                      onMouseLeave={() => setFocusedAbility(null)}
                      onFocus={() => setFocusedAbility(abilityId)}
                      onBlur={() => setFocusedAbility(null)}
                      onClick={() => handleAbilityClick(activeCombatant, abilityId)}
                    >
                      {def.name}
                      {dmg ? ` · ${dmg.min}–${dmg.max} dmg` : ''}
                      {cooldown > 0 ? ` (CD ${cooldown})` : ''}
                    </Button>
                  );
                })}
              </div>

              {(() => {
                const shownAbilityId = pendingAbility ?? focusedAbility;
                const shownIsDamage = shownAbilityId ? DAMAGE_KINDS.has(getAbility(shownAbilityId).kind) : false;
                return (
                  <div className="min-h-[2.75rem] rounded-md border border-slate-700 bg-slate-800/40 p-2 text-xs text-slate-300">
                    <p>
                      {shownAbilityId
                        ? getAbility(shownAbilityId).description
                        : 'Hover or focus a skill to see what it does.'}
                    </p>
                    {shownIsDamage && referenceEnemy && (
                      <p className="mt-1 text-slate-500">
                        Damage shown is estimated vs. {referenceEnemy.name} and varies with the target&apos;s
                        defense.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Resolving enemy actions...</p>
          )}
        </Panel>
      )}

      <Panel title="Combat Log">
        <div className="flex h-40 flex-col gap-1 overflow-y-auto text-xs text-slate-300">
          {view.log.map((entry, idx) => (
            <div key={idx}>
              <span className="text-slate-500">R{entry.round}</span> {entry.text}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </Panel>
      </div>
    </div>
  );
}
