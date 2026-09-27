import type { GlossaryEntry } from "@/components/study/term";

/**
 * Single source of truth for every term this topic uses across Simulate and
 * Study. The `/glossary` tab renders this whole list; every inline `<Term>`
 * popover elsewhere looks a definition up from this same array.
 */
export const GLOSSARY: GlossaryEntry[] = [
  {
    id: "sharding",
    term: "Sharding / partitioning",
    definition:
      'Splitting one dataset across several machines so each holds only part of it. Every read and write first has to answer "which machine has this key?" — and the scheme that answers it decides what happens when machines come and go.',
  },
  {
    id: "modulo-hashing",
    term: "Modulo hashing (hash % N)",
    definition:
      "The naive way to pick a server: hash the key and take the remainder after dividing by the number of servers N. Perfectly even, trivially fast — and when N changes, almost every key's remainder changes with it.",
  },
  {
    id: "consistent-hashing",
    term: "Consistent hashing",
    definition:
      "A way of assigning keys to servers so that adding or removing one server moves only about 1/N of the keys, instead of nearly all of them. Keys and servers are hashed onto the same ring, and each key belongs to the next server clockwise.",
  },
  {
    id: "hash-ring",
    term: "Hash ring",
    definition:
      "The hash space 0 … 2³²−1 drawn as a circle, so the largest value wraps around to 0. Both servers and keys are placed on it by hashing them, which is what lets them be compared.",
  },
  {
    id: "clockwise-lookup",
    term: "Clockwise lookup (successor)",
    definition:
      "How a key finds its owner on a ring: start at the key's position and walk clockwise until you hit the first server (or virtual node). In code it's a binary search over the sorted server positions — O(log n), not an actual walk.",
  },
  {
    id: "virtual-node",
    term: "Virtual node (v-node, token)",
    definition:
      'One of many positions a single physical server takes on the ring, each made by hashing a variant of its name ("N2#vn0", "N2#vn1"…). Many small arcs per server average out to an even share; with one position each, arc sizes are left to luck.',
  },
  {
    id: "remapping",
    term: "Remapping",
    definition:
      "A key changing owner because the cluster changed shape. For a cache, every remapped key is a cold miss on its new server, even though the data was sitting safely on the old one.",
  },
  {
    id: "minimal-disruption",
    term: "Minimal disruption (K/N)",
    definition:
      "The best any scheme can do when a server joins or leaves: only the keys that have to change owner do. With K keys and N servers that's about K/N keys — one server's worth. Consistent hashing achieves it; modulo moves about K·(N−1)/N.",
  },
  {
    id: "cache-stampede",
    term: "Cache stampede (thundering herd)",
    definition:
      "Many cache misses landing on the backing database at the same moment, because the cache that normally absorbs them went cold all at once. The database is sized for the miss rate on a warm cache, not for this, so it slows down or falls over.",
  },
  {
    id: "hot-spot",
    term: "Hot spot",
    definition:
      "A server carrying well above its fair share of keys or traffic. On a ring with few virtual nodes it's usually just luck: one server happened to land after a long empty arc.",
  },
  {
    id: "load-imbalance",
    term: "Load imbalance (std-dev)",
    definition:
      "Here: the standard deviation of each node's share of the hash space, divided by the fair share 1/N. 0% is perfectly even; 50% means a typical node is off by half a node's worth of load.",
  },
  {
    id: "rendezvous-hashing",
    term: "Rendezvous hashing (HRW)",
    definition:
      "Highest Random Weight: for each key, score every server with hash(key, server) and pick the highest. Moves the same minimal 1/N as a ring and needs no virtual nodes, but a lookup costs O(N) hashes instead of a binary search.",
  },
  {
    id: "range-partitioning",
    term: "Range partitioning",
    definition:
      "Giving each server a contiguous range of keys (A–F, G–M…) and recording the ranges in a metadata table. Range scans stay on one server and ranges can be split or moved one at a time, but sequential keys pile onto one range unless they're hashed first.",
  },
  {
    id: "replication-factor",
    term: "Replication / preference list",
    definition:
      "On a ring, storing each key on the next R distinct servers clockwise instead of just one. When a server dies its keys already have copies on the neighbours that inherit them, so the handover is warm.",
  },
];
