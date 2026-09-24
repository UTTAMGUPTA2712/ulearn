/**
 * The one hash function every hashing-family topic uses (Hashing, Consistent
 * Hashing, Bloom Filter), so a given key lands in the same place across all
 * three. Non-cryptographic on purpose: fast, deterministic and well spread,
 * with no attempt to resist someone crafting collisions.
 */

/** 32-bit FNV-1a parameters, from the reference spec (isthe.com/chongo/tech/comp/fnv). */
const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** A second, arbitrary starting state, so `kHashes` gets a hash independent of the first. */
const SECOND_OFFSET_BASIS = 0x5bd1e995;

const encoder = new TextEncoder();

function fnv1aFrom(basis: number, key: string): number {
  let hash = basis;
  // Hash UTF-8 bytes, not UTF-16 code units, so results match the reference
  // test vectors (fnv1a("a") === 0xe40c292c) for any input, not just ASCII.
  for (const byte of encoder.encode(key)) {
    hash ^= byte;
    // Math.imul keeps the multiply in 32-bit integer space; a plain `*`
    // would lose precision once the product passes 2^53.
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0; // reinterpret as unsigned
}

/** 32-bit FNV-1a: XOR in each byte, then multiply by the FNV prime. Returns an unsigned integer in [0, 2^32). */
export function fnv1a(key: string): number {
  return fnv1aFrom(FNV_OFFSET_BASIS, key);
}

/**
 * `k` bucket indexes in [0, m) for one key, via double hashing:
 * index_i = (h1 + i * h2) mod m. Two real hashes stand in for k independent
 * ones (Kirsch & Mitzenmacher, 2006), which is what a Bloom filter needs.
 * `h2` is forced odd so it's never 0 — otherwise every index would repeat h1.
 */
export function kHashes(key: string, k: number, m: number): number[] {
  const h1 = fnv1a(key);
  const h2 = (fnv1aFrom(SECOND_OFFSET_BASIS, key) | 1) >>> 0;
  // Plain number math is exact here: h1 + i * h2 stays far below 2^53 for any realistic k.
  return Array.from({ length: k }, (_, i) => (h1 + i * h2) % m);
}
