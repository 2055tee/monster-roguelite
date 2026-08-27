/** Turns a speciesId like "flame_pup" into a display label "Flame Pup". */
export function formatSpeciesName(speciesId: string): string {
  return speciesId
    .split(/[_-]/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function formatPct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
