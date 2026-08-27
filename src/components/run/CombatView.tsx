'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { StatBar } from '@/components/ui/StatBar';
import { getAbility } from '@/lib/game/abilities';
import { submitCombatAction } from '@/server/actions/combat';
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
          <span>
            {combatant.emoji} {combatant.name}{' '}
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
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
              {pendingAbility ? (
                <div className="flex items-center justify-between rounded-md bg-slate-800 p-2 text-sm text-slate-300">
                  <span>
                    Select a target for <strong>{getAbility(pendingAbility).name}</strong>...
                  </span>
                  <Button variant="ghost" onClick={() => setPendingAbility(null)} disabled={busy}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {['basic_attack', ...activeCombatant.abilities].map((abilityId) => {
                    const def = getAbility(abilityId);
                    const cooldown = activeCombatant.cooldowns[abilityId] ?? 0;
                    const disabled = busy || cooldown > 0;
                    return (
                      <Button
                        key={abilityId}
                        variant="secondary"
                        disabled={disabled}
                        onClick={() => handleAbilityClick(activeCombatant, abilityId)}
                      >
                        {def.name}
                        {cooldown > 0 ? ` (CD ${cooldown})` : ''}
                      </Button>
                    );
                  })}
                </div>
              )}
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
  );
}
