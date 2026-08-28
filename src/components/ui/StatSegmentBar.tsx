import type { Stats } from '@/lib/game/types';
import { power } from '@/lib/game/stats';

type StatSegmentBarProps = {
  stats: Stats;
  /** Roster-wide max power, so bar lengths are comparable across cards. Falls back to this monster's own power (100% width) if omitted or 0. */
  maxPower?: number;
};

const SEGMENTS: { key: keyof Stats; label: string; colorClassName: string; contribution: (s: Stats) => number }[] = [
  { key: 'hp', label: 'HP', colorClassName: 'bg-red-500', contribution: (s) => s.hp / 5 },
  { key: 'atk', label: 'ATK', colorClassName: 'bg-amber-500', contribution: (s) => s.atk * 2 },
  { key: 'def', label: 'DEF', colorClassName: 'bg-sky-500', contribution: (s) => s.def * 1.5 },
  { key: 'spd', label: 'SPD', colorClassName: 'bg-emerald-500', contribution: (s) => s.spd },
];

export function StatSegmentBar({ stats, maxPower }: StatSegmentBarProps) {
  const total = power(stats);
  const scale = maxPower && maxPower > 0 ? maxPower : total;
  const barPct = scale > 0 ? Math.min(100, (total / scale) * 100) : 0;

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
        <span className="font-semibold">Power</span>
        <span>{Math.round(total)}</span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-800" style={{ width: '100%' }}>
        <div className="flex h-full" style={{ width: `${barPct}%` }}>
          {SEGMENTS.map((seg) => {
            const contribution = seg.contribution(stats);
            const segPct = total > 0 ? (contribution / total) * 100 : 0;
            return (
              <div
                key={seg.key}
                className={seg.colorClassName}
                style={{ width: `${segPct}%` }}
                title={`${seg.label}: ${stats[seg.key]}`}
              />
            );
          })}
        </div>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-slate-400">
        {SEGMENTS.map((seg) => (
          <span key={seg.key} className="inline-flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-sm ${seg.colorClassName}`} />
            {seg.label} {stats[seg.key]}
          </span>
        ))}
      </div>
    </div>
  );
}
