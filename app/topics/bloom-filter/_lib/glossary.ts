import type { GlossaryEntry } from "@/components/study/term";

/**
 * Single source of truth for every term this topic uses across Simulate and
 * Study. The `/glossary` tab renders this whole list; every inline `<Term>`
 * popover elsewhere looks a definition up from this same array.
 */
export const GLOSSARY: GlossaryEntry[] = [
  {
    id: "bloom-filter",
    term: "Bloom filter",
    definition:
      "A bit array plus k hash functions that answers \"is this key in the set?\" with either \"definitely not\" or \"maybe\". It never stores the keys themselves, so it fits in a tiny fraction of the memory a real set would need.",
  },
  {
    id: "bit-array",
    term: "Bit array (m)",
    definition:
      "The filter's entire memory: m bits, all starting at 0. Inserting a key sets k of them to 1. Nothing else is stored — not the key, not a count, not which key set which bit.",
  },
  {
    id: "k-hashes",
    term: "Hash functions (k)",
    definition:
      "How many bit positions each key maps to. More hashes make each key's fingerprint more specific, but also fill the array faster. The best k for a given m and n is (m/n)·ln 2.",
  },
  {
    id: "double-hashing",
    term: "Double hashing",
    definition:
      "Making k indexes out of just two real hashes: index_i = (h1 + i·h2) mod m. Kirsch and Mitzenmacher showed this loses nothing measurable against k independent hash functions, and it's how most real Bloom filters work.",
  },
  {
    id: "saturation",
    term: "Saturation",
    definition:
      "The fraction of bits set to 1. An absent key slips through only if all k of its bits happen to be 1, so the fuller the array, the more often that happens. A well-sized filter sits near 50%.",
  },
  {
    id: "false-positive",
    term: "False positive",
    definition:
      "The filter says \"maybe present\" for a key that was never inserted, because other keys happened to set all k of its bits. The caller then does the expensive lookup anyway and finds nothing. Bloom filters accept these by design.",
  },
  {
    id: "false-negative",
    term: "False negative",
    definition:
      "The filter says \"definitely absent\" for a key that is actually stored. A correctly used Bloom filter can never do this — bits only ever go from 0 to 1. Clearing bits to delete a key is exactly what breaks that guarantee.",
  },
  {
    id: "fp-rate",
    term: "False positive rate (p)",
    definition:
      "The chance an absent key passes the filter: p ≈ (1 − e^(−kn/m))^k. Roughly 10 bits per key with k = 7 gives about 1%; each extra ~4.8 bits per key cuts it by another 10×.",
  },
  {
    id: "negative-lookup",
    term: "Negative lookup",
    definition:
      "Asking for a key that doesn't exist. Without a filter, proving absence means actually reading storage — and in an LSM tree, reading every level. These are exactly the lookups a Bloom filter makes nearly free.",
  },
  {
    id: "disk-seek",
    term: "Disk seek",
    definition:
      "Moving a spinning disk's read head to the right track and waiting for the sector to come round — around 10 ms. SSDs have no head, but a random read still costs ~100 µs, roughly a thousand times a RAM lookup.",
  },
  {
    id: "sstable",
    term: "SSTable",
    definition:
      "Sorted String Table: an immutable, sorted file of key-value pairs on disk, written by LSM-tree databases like Cassandra, RocksDB and LevelDB. A lookup may have to check many of them, so each one carries its own Bloom filter.",
  },
  {
    id: "lsm-tree",
    term: "LSM tree",
    definition:
      "Log-Structured Merge tree: writes go to an in-memory table that's flushed to disk as SSTables and merged in the background. Writes are fast; reads may have to look through several SSTables, which is the cost Bloom filters cut down.",
  },
  {
    id: "counting-bloom-filter",
    term: "Counting Bloom filter",
    definition:
      "Replaces each bit with a small counter (usually 4 bits). Inserts increment, deletes decrement, and a slot reads as \"set\" while its count is above 0. Deletion becomes safe at about 4× the memory.",
  },
  {
    id: "cuckoo-filter",
    term: "Cuckoo filter",
    definition:
      "A newer alternative that stores a short fingerprint of each key in one of two candidate buckets. It supports deletion, and below about a 3% false positive rate it uses less space than a Bloom filter.",
  },
];
