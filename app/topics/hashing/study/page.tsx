import type { Metadata } from "next";

import { ComparisonTable } from "@/components/study/comparison-table";
import { ConceptCard } from "@/components/study/concept-card";
import { Section } from "@/components/study/section";
import { TableOfContents } from "@/components/study/table-of-contents";
import { TopicLink } from "@/components/topic/topic-link";
import { fnv1a } from "@/lib/hashing";
import { topicMetadata } from "@/lib/seo";

export const metadata: Metadata = topicMetadata("hashing", "study");

const SECTIONS = [
  "The problem: finding one key among thousands",
  "What a hash function is",
  "Collisions are guaranteed",
  "Chaining vs. open addressing",
  "Load factor and resizing",
  "Types of hashing",
  "Where hashing shows up",
];

/** Worked examples are computed from the real `fnv1a` at build time, so the numbers on this page can't drift from the simulation's. */
const EXAMPLE_KEYS = ["apple", "apply", "avocado", "banana"];
const M = 16;

/** Chance that n keys dropped uniformly into m buckets produce at least one collision. */
function collisionChance(n: number, m: number) {
  let allDistinct = 1;
  for (let i = 0; i < n; i++) allDistinct *= (m - i) / m;
  return 1 - allDistinct;
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

const FNV_SOURCE = `function fnv1a(key: string): number {
  let hash = 0x811c9dc5;                 // FNV offset basis
  for (const byte of utf8Bytes(key)) {
    hash ^= byte;                        // mix this byte in
    hash = Math.imul(hash, 0x01000193);  // multiply by the FNV prime
  }
  return hash >>> 0;                     // read as an unsigned 32-bit number
}

const bucket = fnv1a(key) % m;`;

export default function HashingStudyPage() {
  const apple = fnv1a("apple");

  return (
    <div className="mx-auto flex max-w-[67rem] gap-12">
      <div className="min-w-0 max-w-3xl flex-1 space-y-8">
        <Section title="The problem: finding one key among thousands">
          <p>
            Say you keep 10,000 user records in a list and need the one for &ldquo;alice&rdquo;.
            Without any structure, you check them one at a time. On average that&apos;s 5,000
            comparisons, and 10,000 when she isn&apos;t there at all. Double the users and every
            lookup takes twice as long.
          </p>
          <p>
            Keeping the list sorted helps (binary search needs about 14 comparisons for 10,000
            items), but now every insert has to shift everything after it to keep the order. What
            you actually want is to compute where &ldquo;alice&rdquo; lives from the key itself and
            go straight there. That&apos;s what a hash table does: turn the key into an array index,
            then look in that one slot.
          </p>
        </Section>

        <Section title="What a hash function is">
          <p>
            A hash function takes a key and returns a number. Three properties make it useful for a
            table:
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <ConceptCard name="Deterministic">
              The same key gives the same number every time, on every machine. Otherwise you could
              never find a key again.
            </ConceptCard>
            <ConceptCard name="Fast">
              It runs on every insert and every lookup, so it has to cost a few nanoseconds, not
              microseconds.
            </ConceptCard>
            <ConceptCard name="Spreads keys evenly">
              Different keys, even nearly identical ones, should land all over the range. Clumped
              output means clumped buckets.
            </ConceptCard>
          </div>
          <p>
            This topic (and the ones after it) uses 32-bit FNV-1a. It starts from a fixed number,
            and for every byte of the key it XORs the byte in and multiplies by a prime. The
            multiply smears each byte across all 32 bits:
          </p>
          <pre className="overflow-x-auto rounded-xl border border-border bg-panel-raised p-4 font-mono text-xs leading-relaxed text-text">
            {FNV_SOURCE}
          </pre>
          <p>
            Worked through for one key: <code className="rounded bg-panel-raised px-1 font-mono text-text">fnv1a(&quot;apple&quot;)</code>{" "}
            is <span className="font-mono text-text">{apple}</span>. With {M} buckets,{" "}
            <span className="font-mono text-text">
              {apple} mod {M} = {apple % M}
            </span>
            , so &ldquo;apple&rdquo; always goes in bucket {apple % M}. Compare a few more keys, and
            the &ldquo;first letter&rdquo; hash from the simulation next to it:
          </p>
          <ComparisonTable
            columns={["fnv1a(key)", `fnv1a mod ${M}`, `first letter mod ${M}`]}
            rows={EXAMPLE_KEYS.map((key) => ({
              label: `"${key}"`,
              values: [
                <span key="h" className="font-mono">{fnv1a(key)}</span>,
                <span key="b" className="font-mono">{fnv1a(key) % M}</span>,
                <span key="f" className="font-mono">{key.charCodeAt(0) % M}</span>,
              ],
            }))}
          />
          <p>
            &ldquo;apple&rdquo; and &ldquo;apply&rdquo; differ by one letter but land in unrelated
            buckets under FNV-1a. That&apos;s the avalanche effect: flip one input bit and about half
            the output bits flip. The first-letter hash puts all three &ldquo;a&rdquo; words in the
            same bucket, and it would do the same for any real list of names, where some first
            letters are much more common than others.
          </p>
        </Section>

        <Section title="Collisions are guaranteed">
          <p>
            There are billions of possible keys and only m buckets. The pigeonhole principle says
            that once you store more than m keys, at least two must share a bucket. With a good hash
            you&apos;ll see collisions long before that, too.
          </p>
          <p>
            That&apos;s the birthday paradox. In a room of just 23 people there&apos;s a{" "}
            {pct(collisionChance(23, 365))} chance that two share a birthday, because what matters is
            the number of <em>pairs</em> (253 of them), not the number of people. Hash tables
            behave the same way. With {M} buckets, just 5 keys already give a{" "}
            {pct(collisionChance(5, M))} chance of a collision, and 8 keys give{" "}
            {pct(collisionChance(8, M))}.
          </p>
          <p>
            So collisions aren&apos;t a sign of a broken hash function. Every hash table needs a
            plan for them, and there are two main ones.
          </p>
        </Section>

        <Section title="Chaining vs. open addressing">
          <div className="grid gap-3 sm:grid-cols-2">
            <ConceptCard name="Chaining">
              Every bucket holds a list. A key that collides is appended to its bucket&apos;s list,
              and a lookup walks that list comparing keys. The table never runs out of room; chains
              just get longer.
            </ConceptCard>
            <ConceptCard name="Open addressing (linear probing)">
              Every key lives directly in the array, one per slot. If a key&apos;s home slot is
              taken, it tries the next slot, then the next, until it finds a free one. A lookup
              follows the same path and stops at the key or at an empty slot.
            </ConceptCard>
          </div>
          <ComparisonTable
            columns={["Chaining", "Open addressing"]}
            rows={[
              {
                label: "Memory",
                values: [
                  "A pointer per entry, plus a separately allocated node for every key",
                  "Just the array. No per-key allocation, but it needs spare empty slots to work",
                ],
              },
              {
                label: "Cache locality",
                values: [
                  "Poor: walking a chain jumps around memory",
                  "Good: probing reads neighboring slots, often in the same cache line",
                ],
              },
              {
                label: "When the table fills",
                values: [
                  "Keeps working; lookups slow down steadily as chains grow",
                  "Clusters merge and probe sequences grow quickly past ~0.7. At 100% an insert has nowhere to go",
                ],
              },
              {
                label: "Deleting a key",
                values: [
                  "Unlink the node. Nothing else changes",
                  "Can't just empty the slot, or lookups for keys past it stop early. Leave a tombstone instead",
                ],
              },
              {
                label: "Who uses it",
                values: [
                  "Java's HashMap (a chain longer than 8 is turned into a balanced tree)",
                  "Python's dict (with a scrambled probe order, not linear), and the Swiss tables behind Rust's HashMap and Go's maps",
                ],
              },
            ]}
          />
          <p>
            Try both in the simulation with the same keys. Under open addressing, notice how
            occupied slots bunch into runs. Any key that hashes into a run has to probe to its end,
            and then makes the run one longer. That&apos;s clustering, and it&apos;s why open
            addressing tables resize earlier than chained ones.
          </p>
        </Section>

        <Section title="Load factor and resizing">
          <p>
            The load factor is keys divided by buckets: n / m. It predicts the cost of a lookup.
            Under chaining with a good hash, the average chain holds n / m keys. Under linear
            probing it gets worse much faster. Knuth&apos;s estimate for a lookup that misses is
            about ½(1 + 1/(1 − α)²) probes: 2.5 at α = 0.5, 8.5 at 0.75 and 50.5 at 0.9.
          </p>
          <p>
            So tables pick a threshold and grow once they pass it: 0.75 for Java&apos;s HashMap,
            2/3 for Python&apos;s dict. Growing usually means doubling m, which keeps the average
            cost per insert constant even though each resize is expensive.
          </p>
          <p>
            And each resize <em>is</em> expensive. A key&apos;s bucket is hash(key) mod m, so a new
            m means a new bucket for most keys. Every key has to be hashed again and copied into
            the new array. Doubling moves about half of them, and going from m to m + 1 moves
            nearly all of them. Watch the &ldquo;moved on last resize&rdquo; counter in the
            simulation.
          </p>
          <p>
            A table can only double while memory lasts. Past that there are two ways out: evict
            (a cache drops its least-recently-used keys instead of growing) or spread the keys
            across several machines.
          </p>
          <p>
            In memory a resize is a brief pause. Now imagine the buckets are cache servers and
            you&apos;re adding a fifth one to four. With hash(key) mod N, about 80% of keys suddenly
            map to a different server, and 80% of your cache misses at once. Moving only the keys
            that have to move is exactly what{" "}
            <TopicLink slug="consistent-hashing">Consistent Hashing</TopicLink> is for.
          </p>
        </Section>

        <Section title="Types of hashing">
          <p>
            &ldquo;Hash function&rdquo; covers several families built for very different goals.
            The simulation only uses the first one; the rest are here so you can tell them apart.
          </p>
          <ComparisonTable
            columns={["Goal", "Key property", "Used for"]}
            rows={[
              {
                label: "Non-cryptographic (FNV, MurmurHash, xxHash)",
                values: [
                  "Speed and even spread",
                  "Nanoseconds per key; easy to craft collisions on purpose",
                  "Hash tables, sharding, checksums against accidental corruption",
                ],
              },
              {
                label: "Cryptographic (SHA-256, BLAKE3)",
                values: [
                  "Nobody can find a collision or reverse it",
                  "Collision- and preimage-resistant; slower",
                  "Signatures, git object IDs, verifying downloads, content addressing",
                ],
              },
              {
                label: "Password (bcrypt, scrypt, Argon2)",
                values: [
                  "Make brute-forcing a stolen hash expensive",
                  "Slow on purpose and tunable, salted, often memory-hard",
                  "Storing passwords, and nothing else",
                ],
              },
              {
                label: "Consistent / rendezvous",
                values: [
                  "Map keys to a changing set of servers",
                  "Adding or removing a server moves only about 1/N of the keys",
                  "Distributed caches, sharded databases, CDNs",
                ],
              },
              {
                label: "Locality-sensitive (SimHash, MinHash)",
                values: [
                  "Similar inputs collide on purpose",
                  "Close inputs get close or equal hashes",
                  "Near-duplicate detection, vector similarity search",
                ],
              },
            ]}
          />
        </Section>

        <Section title="Where hashing shows up">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-text">Hash maps and sets</strong>: every language&apos;s
              dictionary type is the table in this simulation, plus a lot of engineering.
            </li>
            <li>
              <strong className="text-text">Database hash indexes and hash joins</strong>: jump
              straight to rows with a given key, or match two tables by hashing one side into
              buckets first.
            </li>
            <li>
              <strong className="text-text">Sharding and partitioning</strong>: hash(key) mod N
              picks which of N machines or partitions owns a key. Kafka&apos;s default partitioner
              does exactly this with MurmurHash2. It inherits the resize problem above whenever N
              changes.
            </li>
            <li>
              <strong className="text-text">Load balancing</strong>: IP hash and URL hash send the
              same client or path to the same backend every time. See it live in the{" "}
              <TopicLink slug="load-balancer">Load Balancer</TopicLink> simulation, including what
              happens when a backend dies.
            </li>
            <li>
              <strong className="text-text">Checksums and deduplication</strong>: identical content
              hashes to identical output, so storage systems and backup tools can spot a chunk
              they already have without comparing it byte by byte.
            </li>
            <li>
              <strong className="text-text">Bloom filters</strong>: hash a key k different ways to
              set k bits, and you can answer &ldquo;definitely not here&rdquo; without touching the
              disk. That&apos;s the third topic in this series:{" "}
              <TopicLink slug="bloom-filter">Bloom Filter</TopicLink>.
            </li>
          </ul>
        </Section>
      </div>

      <TableOfContents sections={SECTIONS} />
    </div>
  );
}
