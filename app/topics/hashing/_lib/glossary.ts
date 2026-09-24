import type { GlossaryEntry } from "@/components/study/term";

/**
 * Single source of truth for every term this topic uses across Simulate and
 * Study. The `/glossary` tab renders this whole list; every inline `<Term>`
 * popover elsewhere looks a definition up from this same array.
 */
export const GLOSSARY: GlossaryEntry[] = [
  {
    id: "hash-function",
    term: "Hash function",
    definition:
      "A function that turns a key of any length into a fixed-size number. It must be deterministic (the same key always gives the same number), fast, and should spread different keys evenly across its output range.",
  },
  {
    id: "hash-code",
    term: "Hash code",
    definition:
      "The number a hash function returns for one key — before it's squeezed into the table with mod m. FNV-1a gives a 32-bit hash code, anywhere from 0 to about 4.3 billion.",
  },
  {
    id: "hash-table",
    term: "Hash table",
    definition:
      "An array of buckets plus a hash function. To store or find a key, hash it, take the result mod the number of buckets, and go straight to that bucket instead of scanning everything.",
  },
  {
    id: "bucket",
    term: "Bucket",
    definition:
      "One slot in a hash table's underlying array, addressed by index 0 to m − 1. A key's bucket is hash(key) mod m. Under chaining a bucket holds a list of keys; under open addressing it holds at most one.",
  },
  {
    id: "collision",
    term: "Collision",
    definition:
      "Two different keys landing in the same bucket. Unavoidable once there are more possible keys than buckets, so every hash table needs a plan for what to do when it happens.",
  },
  {
    id: "chaining",
    term: "Chaining",
    definition:
      "Collision handling where each bucket holds a linked list (a chain) of every key that hashed there. A collision just makes the chain longer; a lookup walks the chain comparing keys.",
  },
  {
    id: "open-addressing",
    term: "Open addressing",
    definition:
      "Collision handling where every key lives directly in the array, one per slot. If a key's home slot is taken, it follows a probe sequence to find another free slot in the same array.",
  },
  {
    id: "linear-probing",
    term: "Linear probing",
    definition:
      "The simplest open-addressing probe sequence: if slot i is taken, try i + 1, then i + 2, wrapping around at the end. Cache-friendly, but prone to clustering.",
  },
  {
    id: "probe",
    term: "Probe",
    definition:
      "One slot inspected while inserting or looking up a key under open addressing. A lookup that needs 1 probe went straight home; one that needs 9 walked past 8 other keys first.",
  },
  {
    id: "clustering",
    term: "Clustering",
    definition:
      "Under linear probing, occupied slots bunch into long contiguous runs. Any key that hashes into a run has to probe to its end, and then makes the run one longer — so clusters grow faster the bigger they get.",
  },
  {
    id: "load-factor",
    term: "Load factor",
    definition:
      "Keys stored divided by number of buckets (n / m). Chains and probe sequences get longer as it rises. Most tables resize once it passes a threshold — 0.75 for Java's HashMap, about 2/3 for Python's dict.",
  },
  {
    id: "rehashing",
    term: "Rehashing",
    definition:
      "Building a new, bigger table and re-inserting every key into it. Since each key's bucket is hash(key) mod m, changing m changes where keys land, so every single key has to be hashed again and many of them move.",
  },
  {
    id: "tombstone",
    term: "Tombstone",
    definition:
      "A marker left in an open-addressing slot when a key is deleted. Emptying the slot outright would cut probe sequences in half and make keys past it unfindable; the tombstone says “keep probing, something used to be here.”",
  },
  {
    id: "uniform-distribution",
    term: "Uniform distribution",
    definition:
      "The goal for a hash function's output: every bucket equally likely for a random key. With it, keys spread out evenly and chains stay short; without it, a few buckets take most of the keys.",
  },
  {
    id: "avalanche-effect",
    term: "Avalanche effect",
    definition:
      "Changing one bit of the input flips about half the bits of the output. It's why “apple” and “apply” land in completely unrelated buckets under a good hash, instead of next to each other.",
  },
  {
    id: "pigeonhole-principle",
    term: "Pigeonhole principle",
    definition:
      "Put more than m items into m boxes and at least one box holds two. There are far more possible keys than buckets, so some keys must share a bucket — collisions are guaranteed, not bad luck.",
  },
  {
    id: "birthday-paradox",
    term: "Birthday paradox",
    definition:
      "Only 23 people give a 50% chance that two share a birthday. Same for buckets: collisions show up far earlier than intuition says — with 16 buckets, 5 keys already give even odds.",
  },
  {
    id: "non-cryptographic-hash",
    term: "Non-cryptographic hash",
    definition:
      "A hash built for speed and even spread — FNV, MurmurHash, xxHash. Great for hash tables and sharding; useless for security, since someone can deliberately craft keys that collide.",
  },
  {
    id: "cryptographic-hash",
    term: "Cryptographic hash",
    definition:
      "A hash designed so nobody can find two inputs with the same output or work back from an output to an input — SHA-256, BLAKE3. Slower than a non-cryptographic hash, and the right choice for checksums you need to trust.",
  },
  {
    id: "fnv-1a",
    term: "FNV-1a",
    definition:
      "A tiny non-cryptographic hash: start from a fixed number, then for every byte XOR it in and multiply by a prime. Fast and well spread for short keys — the hash every hashing topic on this site uses.",
  },
];
