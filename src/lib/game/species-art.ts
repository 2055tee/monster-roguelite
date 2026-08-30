const SPECIES_ART_NAMES = new Set([
  'Sprigling',
  'Cinderpup',
  'Pebblet',
  'Zaplet',
  'Thornmaw',
  'Emberfang',
  'Glacierhorn',
  'Voidmaw',
]);

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/** Transparent-background icon for inline/UI use. Null if no art exists yet for this species. */
export function speciesIconUrl(name: string): string | null {
  return SPECIES_ART_NAMES.has(name) ? `/monsters/icons/${slugify(name)}.png` : null;
}

/** Full illustrated artwork (with background). Null if no art exists yet for this species. */
export function speciesArtUrl(name: string): string | null {
  return SPECIES_ART_NAMES.has(name) ? `/monsters/${slugify(name)}.jpg` : null;
}
