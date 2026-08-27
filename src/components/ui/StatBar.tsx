type StatBarProps = {
  label: string;
  value: number;
  max: number;
  colorClassName?: string;
};

export function StatBar({ label, value, max, colorClassName = 'bg-emerald-500' }: StatBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;

  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-xs text-slate-300">
        <span>{label}</span>
        <span>
          {value}/{max}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full rounded-full ${colorClassName}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
