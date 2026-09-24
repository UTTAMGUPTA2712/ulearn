import { fnv1a } from "@/lib/hashing";

import type { HashFnId } from "./types";

interface HashFn {
  label: string;
  compute: (key: string) => number;
  /** The left-hand side of the computation, e.g. `'s'` or `len("salt")` — shown in the hash box. */
  formula: (key: string) => string;
}

/**
 * The three hash functions the reader can switch between. Only FNV-1a is a
 * real hash; the other two are the classic mistakes — using one feature of
 * the key instead of all of it — kept here so the reader can watch what that
 * costs.
 */
export const HASH_FNS: Record<HashFnId, HashFn> = {
  fnv1a: {
    label: "FNV-1a",
    compute: fnv1a,
    formula: (key) => `fnv1a("${key}")`,
  },
  "first-letter": {
    label: "First letter",
    compute: (key) => key.charCodeAt(0),
    formula: (key) => `'${key[0]}'`,
  },
  length: {
    label: "Length",
    compute: (key) => key.length,
    formula: (key) => `len("${key}")`,
  },
};

/** One-line version for the event log, e.g. `'s' = 115`. */
export function explainHash(hashFn: HashFnId, key: string, value: number): string {
  return `${HASH_FNS[hashFn].formula(key)} = ${value}`;
}
