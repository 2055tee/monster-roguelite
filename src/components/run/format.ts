import type { MonsterSpecies } from '@/lib/game/types';

/**
 * Turns a speciesId into a display label. Species ids are DB UUIDs, so this
 * is only a legible fallback for when a catalog lookup isn't available (or
 * doesn't have the id) -- prefer speciesName() below whenever a catalog is
 * in scope.
 */
export function formatSpeciesName(speciesId: string): string {
  return speciesId
    .split(/[_-]/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Resolves a speciesId to its real catalog name, falling back to formatSpeciesName. */
export function speciesName(speciesId: string, catalog: Record<string, MonsterSpecies>): string {
  return catalog[speciesId]?.name ?? formatSpeciesName(speciesId);
}

export function formatPct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
