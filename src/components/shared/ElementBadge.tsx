import type { Element } from '@/lib/game/types';
import { ELEMENT_BG, ELEMENT_BORDER, ELEMENT_EMOJI, ELEMENT_LABEL, ELEMENT_TEXT } from './elements';

export function ElementBadge({ element, compact = false }: { element: Element; compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${ELEMENT_BORDER[element]} ${ELEMENT_BG[element]} ${ELEMENT_TEXT[element]}`}
    >
      <span className="leading-none">{ELEMENT_EMOJI[element]}</span>
      {!compact && ELEMENT_LABEL[element]}
    </span>
  );
}
