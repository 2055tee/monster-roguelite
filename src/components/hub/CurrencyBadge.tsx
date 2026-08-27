export function CurrencyBadge({ amount }: { amount: number }) {
  return (
    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-amber-300">
      🪙 {amount.toLocaleString()}
    </span>
  );
}
