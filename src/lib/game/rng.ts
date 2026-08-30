function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** splitmix32 finalizer -- maps any integer (e.g. an hour bucket) to a well-distributed 32-bit seed. */
export function hash32(n: number): number {
  let x = n | 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x = (x ^ (x >>> 16)) >>> 0;
  return x;
}

export function createRng(seed: number, cursor: number): { next: () => number; cursor: number } {
  const gen = mulberry32(seed);

  // Advance the generator `cursor` times so resuming from a persisted cursor
  // reproduces the same future sequence.
  for (let i = 0; i < cursor; i++) {
    gen();
  }

  const rng = {
    cursor,
    next(): number {
      const value = gen();
      rng.cursor += 1;
      return value;
    },
  };

  return rng;
}
