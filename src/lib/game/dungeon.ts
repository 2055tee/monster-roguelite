function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeExpectedTurns(
  teamPower: number,
  bossPower: number
): { expectedTurnsPerRoom: number; totalExpectedTurns: number } {
  const r = teamPower / bossPower;
  const expectedTurnsPerRoom = clamp(Math.round(6 / r), 3, 15);
  const totalExpectedTurns = expectedTurnsPerRoom * 4;
  return { expectedTurnsPerRoom, totalExpectedTurns };
}
