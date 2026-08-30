import Image from 'next/image';
import { speciesIconUrl } from '@/lib/game/species-art';

type Props = {
  name: string;
  emoji: string;
  size?: number;
  className?: string;
};

export function SpeciesIcon({ name, emoji, size = 24, className }: Props) {
  const iconUrl = speciesIconUrl(name);
  if (!iconUrl) {
    return <span className={className}>{emoji}</span>;
  }
  return (
    <Image
      src={iconUrl}
      alt={name}
      width={size}
      height={size}
      className={className}
      style={{ display: 'inline-block', objectFit: 'contain', verticalAlign: 'middle' }}
    />
  );
}
