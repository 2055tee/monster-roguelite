import { xpProgress } from '@/lib/game/xp';

type XpBarProps = {
  level: number;
  xp: number;
};

export function XpBar({ level, xp }: XpBarProps) {
  const { current, needed, pct } = xpProgress(level, xp);
  const isMax = needed === 0;

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
        <span className="font-semibold">Lv {level}</span>
        <span className="text-slate-400">{isMax ? 'MAX' : `${current} / ${needed} XP`}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full rounded-full ${isMax ? 'bg-amber-400' : 'bg-sky-400'}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}
