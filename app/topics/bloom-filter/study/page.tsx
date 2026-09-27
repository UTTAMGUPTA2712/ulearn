import type { Metadata } from "next";

import { ComparisonTable } from "@/components/study/comparison-table";
import { ConceptCard } from "@/components/study/concept-card";
import { Section } from "@/components/study/section";
import { TableOfContents } from "@/components/study/table-of-contents";
import { TopicLink } from "@/components/topic/topic-link";
import { kHashes } from "@/lib/hashing";
import { topicMetadata } from "@/lib/seo";

import { theoreticalFpRate } from "../_lib/engine";

export const metadata: Metadata = topicMetadata("bloom-filter", "study");

const SECTIONS = [
  "The problem: proving a key isn't there",
  "How a Bloom filter works",
  "The trade-off",
  "Sizing m and k",
  "Why you can't delete",
  "HashSet vs. Bloom vs. Cuckoo vs. Counting",
  "Deep dive: one Bloom filter per SSTable",
  "Where else Bloom filters show up",
];

/** Worked example, computed from the same `kHashes` the simulation uses, so these indexes match what the diagram would show. */
const EX_M = 32;
const EX_K = 3;
const EX_STORED = ["alice", "bob", "dave"];
const EX_QUERY = ["erin", "zara"];

function exampleBits() {
  const bits = new Array<number>(EX_M).fill(0);
  for (const key of EX_STORED) for (const i of kHashes(key, EX_K, EX_M)) bits[i] = 1;
  return bits;
}

/** Bits per key → best k and the false positive rate it buys. */
const BITS_PER_KEY = [4, 8, 10, 15, 20];

function atOptimalK(bitsPerKey: number) {
  const k = Math.max(1, Math.round(bitsPerKey * Math.LN2));
  return { k, p: theoreticalFpRate(k, 1, bitsPerKey) };
}

const pct = (x: number) => (x < 0.001 ? `${(x * 100).toFixed(3)}%` : `${(x * 100).toFixed(x < 0.01 ? 2 : 1)}%`);

/** m for n keys at false positive rate p: m = −n·ln p / (ln 2)². */
function bitsFor(n: number, p: number) {
  return (-n * Math.log(p)) / (Math.LN2 * Math.LN2);
}

const N_KEYS = 100_000_000;
const MB = (bits: number) => `${Math.round(bits / 8 / 1_000_000).toLocaleString("en-US")} MB`;

const INSERT_SOURCE = `insert(key):
  for i in 0 ..< k:
    bits[(a + i·b) mod m] = 1        // a, b = two hashes of key

mightContain(key):
  for i in 0 ..< k:
    if bits[(a + i·b) mod m] == 0:
      return false                   // definitely not present
  return true                        // maybe present — go check`;

export default function BloomFilterStudyPage() {
  const bits = exampleBits();
  const setCount = bits.filter((b) => b === 1).length;

  return (
    <div className="mx-auto flex max-w-[67rem] gap-12">
      <div className="min-w-0 max-w-3xl flex-1 space-y-8">
        <Section title="The problem: proving a key isn't there">
          <p>
            A database gets asked for <span className="font-mono text-text">user:48151</span>. The key doesn&apos;t
            exist. How much work does it take to say so?
          </p>
          <p>
            If every key sits in an in-memory HashSet, almost none, but the set holds every key in full. A hundred
            million 16-byte keys plus per-entry overhead is several gigabytes, for one table on one node. That&apos;s
            memory you wanted for caching actual data, and it grows with every key you add.
          </p>
          <p>
            If the keys live only on disk, proving absence means reading the disk. A random read on a spinning
            disk is about 10 ms; on an SSD, about 100 µs. Both are roughly a thousand times slower than RAM, and a
            key that isn&apos;t there costs as much to look up as one that is. It&apos;s often worse: an LSM-tree
            database like Cassandra or RocksDB keeps data in many sorted files, so a missing key has to be checked
            in <em>every one of them</em> before the database can say &ldquo;not found&rdquo;.
          </p>
          <p>
            Lots of real traffic is exactly this kind of lookup: &ldquo;has this user already seen this
            post?&rdquo;, &ldquo;is this username taken?&rdquo;, &ldquo;does this row exist before I insert
            it?&rdquo;. A Bloom filter is a small, fixed-size structure in RAM that answers most of these without
            touching the disk. It uses about 10 bits per key instead of the whole key, and pays for that by
            sometimes saying &ldquo;maybe&rdquo; when the honest answer is &ldquo;no&rdquo;.
          </p>
        </Section>

        <Section title="How a Bloom filter works">
          <p>
            Start with an array of <strong className="text-text">m</strong> bits, all 0, and pick{" "}
            <strong className="text-text">k</strong> hash functions. To insert a key, hash it k ways and set those
            k bits to 1. To check a key, hash it the same k ways and look at those bits. If any of them is 0, the
            key was never inserted, because inserting it would have set that bit. If they&apos;re all 1, the key
            was <em>probably</em> inserted, or other keys happened to set every one of its bits.
          </p>
          <pre className="overflow-x-auto rounded-xl border border-border bg-panel-raised p-4 font-mono text-xs leading-relaxed text-text">
            {INSERT_SOURCE}
          </pre>
          <p>
            Real filters rarely run k separate hash functions. They compute two hashes, a and b, and derive the rest
            as <span className="font-mono text-text">(a + i·b) mod m</span>. Kirsch and Mitzenmacher showed in
            2006 that this double hashing does as well as k independent hashes, and it&apos;s what the simulation
            does too. Here is a {EX_M}-bit filter with k = {EX_K} after inserting {EX_STORED.length} keys:
          </p>
          <ComparisonTable
            columns={["bit indexes", "result"]}
            rows={[
              ...EX_STORED.map((key) => ({
                label: `insert "${key}"`,
                values: [
                  <span key="i" className="font-mono">{kHashes(key, EX_K, EX_M).join(", ")}</span>,
                  "bits set to 1",
                ],
              })),
              ...EX_QUERY.map((key) => {
                const idx = kHashes(key, EX_K, EX_M);
                const zero = idx.find((i) => bits[i] === 0);
                return {
                  label: `check "${key}"`,
                  values: [
                    <span key="i" className="font-mono">{idx.join(", ")}</span>,
                    zero === undefined ? (
                      <span key="r" className="text-status-down">all 1 — false positive</span>
                    ) : (
                      <span key="r" className="text-status-up">bit {zero} is 0 — definitely absent</span>
                    ),
                  ],
                };
              }),
            ]}
          />
          <p>
            Three keys set {setCount} of {EX_M} bits. Notice nothing in the array says which key set which bit, and
            nothing records the keys themselves. That is where both the space saving and every limitation below
            come from.
          </p>
        </Section>

        <Section title="The trade-off">
          <div className="grid gap-3 sm:grid-cols-2">
            <ConceptCard name="Zero false negatives">
              Bits only ever go from 0 to 1. Once a key is inserted, its k bits stay 1 forever, so checking it
              always finds them. If the filter says &ldquo;definitely not&rdquo;, that answer is guaranteed, and the
              caller can skip the disk without a second thought.
            </ConceptCard>
            <ConceptCard name="Acceptable false positives">
              As the array fills, an absent key&apos;s k bits are increasingly likely to all be 1 already. The
              filter says &ldquo;maybe&rdquo;, the caller does the real lookup, and finds nothing. That costs one
              wasted read, not a wrong answer, because the real lookup is still the source of truth.
            </ConceptCard>
          </div>
          <p>
            That asymmetry is the whole design. The filter sits in front of something slow and authoritative, and
            only ever makes the fast path faster. A false positive costs what the lookup would have cost without a
            filter. A false negative would return wrong data, which is why the structure can&apos;t allow one.
          </p>
        </Section>

        <Section title="Sizing m and k">
          <p>
            With n keys in m bits and k hashes, the chance a given bit is still 0 is about{" "}
            <span className="font-mono text-text">e^(−kn/m)</span>. An absent key gets through only if all k of its
            bits are 1:
          </p>
          <pre className="overflow-x-auto rounded-xl border border-border bg-panel-raised p-4 font-mono text-xs leading-relaxed text-text">
            {`p ≈ (1 − e^(−kn/m))^k          false positive rate
k_best = (m/n) · ln 2           ≈ 0.69 × bits per key
m = −n · ln p / (ln 2)²         bits needed for a target p`}
          </pre>
          <p>
            The best k is where each bit ends up 1 with probability one half. Fewer hashes and a fingerprint is too
            vague; more and the array fills up too fast. Once k is optimal, only bits per key matters:
          </p>
          <ComparisonTable
            columns={["best k", "false positive rate"]}
            rows={BITS_PER_KEY.map((b) => {
              const { k, p } = atOptimalK(b);
              return {
                label: `${b} bits per key`,
                values: [<span key="k" className="font-mono">{k}</span>, <span key="p" className="font-mono">{pct(p)}</span>],
              };
            })}
          />
          <p>
            Roughly 10 bits per key buys 1%, and each extra ~4.8 bits cuts it another tenfold. For{" "}
            {N_KEYS.toLocaleString("en-US")} keys, a 1% filter needs about {MB(bitsFor(N_KEYS, 0.01))} and a 0.1%
            filter about {MB(bitsFor(N_KEYS, 0.001))}, against gigabytes for the keys themselves. The size depends
            on how many keys there are, not how long they are: a 200-byte URL costs the same 10 bits as a 4-byte
            integer.
          </p>
          <p>
            One catch: m is fixed when the filter is built. Insert far more keys than planned and the rate climbs
            past anything you sized for, which is what &ldquo;Saturate to 90%&rdquo; shows. A filter can&apos;t be
            grown in place because it no longer knows its keys. You rebuild it from the source data, or stack a new,
            larger filter on top (a <em>scalable Bloom filter</em>).
          </p>
        </Section>

        <Section title="Why you can't delete">
          <p>
            To delete a key you&apos;d clear its k bits. But any of those bits may also belong to other keys, and
            the filter has no record of which. Clear a shared bit and every key that relied on it now reads
            &ldquo;definitely absent&rdquo; while it&apos;s still stored: a false negative, the one error the
            filter promised never to make. The fuller the filter, the more bits are shared, so the more damage one
            delete does. The simulation&apos;s &ldquo;Delete key attempt&rdquo; picks the most-shared key on
            purpose so you can watch it happen.
          </p>
          <p>
            A <strong className="text-text">counting Bloom filter</strong> replaces each bit with a small counter,
            usually 4 bits. Insert increments, delete decrements, and a slot counts as set while it&apos;s above 0.
            That makes deletes safe, as long as you only delete keys you actually inserted, for about four times the
            memory. A <strong className="text-text">cuckoo filter</strong> gets deletion more cheaply by storing a
            short fingerprint per key instead of setting shared bits.
          </p>
        </Section>

        <Section title="HashSet vs. Bloom vs. Cuckoo vs. Counting">
          <ComparisonTable
            columns={["In-memory HashSet", "Bloom filter", "Cuckoo filter", "Counting Bloom"]}
            rows={[
              {
                label: "Answers",
                values: ["yes / no, exactly", "definitely not / maybe", "definitely not / maybe", "definitely not / maybe"],
              },
              { label: "False negatives", values: ["never", "never", "never*", "never*"] },
              {
                label: "False positives",
                values: ["never", "tunable via m, k", "tunable via fingerprint size", "tunable via m, k"],
              },
              {
                label: "Memory per key (≈1% FP)",
                values: ["the whole key + 16–50 B overhead", "≈ 9.6 bits", "≈ 10 bits", "≈ 38 bits (4-bit counters)"],
              },
              { label: "Delete", values: ["yes", "no", "yes", "yes"] },
              {
                label: "Lookup cost",
                values: ["1 hash + key compare", "k bit reads, scattered", "2 buckets at most", "k counter reads"],
              },
              { label: "Can list its keys", values: ["yes", "no", "no", "no"] },
              {
                label: "Grow later",
                values: ["rehash in place", "rebuild from source", "rebuild; inserts fail near ~95% full", "rebuild from source"],
              },
            ]}
          />
          <p className="text-xs text-text-faint">
            * Only if you never delete a key that wasn&apos;t inserted. Deleting a false positive removes some
            other key&apos;s fingerprint or count.
          </p>
          <p>
            Use a HashSet when the keys fit comfortably in memory and you need exact answers. Use a Bloom filter
            when they don&apos;t, the set only grows (or is rebuilt periodically), and a false &ldquo;maybe&rdquo;
            costs one extra read. Reach for a cuckoo filter when you need deletes or want a low false positive rate
            in less space. A counting Bloom filter is the simplest way to add deletes to code that already uses a
            Bloom filter, if the 4× memory is affordable.
          </p>
        </Section>

        <Section title="Deep dive: one Bloom filter per SSTable">
          <p>
            An LSM-tree database (Cassandra, RocksDB, LevelDB, HBase, ScyllaDB) buffers writes in memory, then
            flushes them to disk as an immutable, sorted file called an SSTable. Background compaction merges
            SSTables together, but at any moment a table is spread across many of them. A read has to find the
            newest version of the key, so it checks SSTables from newest to oldest until it finds one.
          </p>
          <p>
            For a key that exists, that search stops early. For a key that doesn&apos;t, it checks every SSTable,
            each one at least an index lookup and usually a disk read. With 20 SSTables that&apos;s 20 reads to
            return nothing. This read amplification is the main cost of the LSM design, and negative lookups are its
            worst case.
          </p>
          <p>
            So each SSTable is written with its own Bloom filter over the keys it contains, and those filters are
            kept in memory. A read checks each SSTable&apos;s filter first and only opens the files whose filter
            says &ldquo;maybe&rdquo;. At a 1% false positive rate, a miss across 20 SSTables costs 0.2 disk reads on
            average instead of 20.
          </p>
          <p>Several details make this pairing work especially well:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-text">SSTables are immutable, so the filter never needs a delete.</strong> A
              deleted row is written as a new tombstone record, not removed from the old file. When compaction
              merges files, it writes a new SSTable and builds a fresh filter for it, so the delete problem above
              never comes up.
            </li>
            <li>
              <strong className="text-text">The key count is known when the filter is built.</strong> Flush and
              compaction know exactly how many keys go into the new file, so every filter is sized correctly and
              never saturates.
            </li>
            <li>
              <strong className="text-text">The rate is a per-table setting.</strong> Cassandra exposes it as{" "}
              <span className="font-mono text-text">bloom_filter_fp_chance</span> (0.01 by default, 0.1 for leveled
              compaction, where a read touches fewer SSTables). RocksDB configures it as bits per key on the table&apos;s
              filter policy, commonly 10.
            </li>
            <li>
              <strong className="text-text">Filter memory is the real budget.</strong> At 10 bits per key, a billion
              keys on a node is about 1.2 GB of filters. RocksDB&apos;s{" "}
              <span className="font-mono text-text">optimize_filters_for_hits</span> skips the filter on the last
              level, which holds most of the data, for workloads where nearly every lookup is for a key that exists.
            </li>
          </ul>
          <p>
            The simulation is this picture shrunk to one filter: the bottom row is the SSTables, and every
            &ldquo;disk seeks prevented&rdquo; is a file the database didn&apos;t have to open.
          </p>
        </Section>

        <Section title="Where else Bloom filters show up">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-text">CDN caches.</strong> Akamai found most URLs are requested exactly once.
              A Bloom filter of recently seen URLs lets the cache store an object only on its second request, which
              keeps one-hit wonders from evicting useful content.
            </li>
            <li>
              <strong className="text-text">Bigtable and HBase.</strong> The same per-file trick as above, from the
              system that popularized the LSM design.
            </li>
            <li>
              <strong className="text-text">Web browsers.</strong> Early versions of Chrome&apos;s Safe Browsing
              kept a Bloom filter of malicious URL prefixes locally and only asked Google&apos;s servers about URLs
              that matched.
            </li>
            <li>
              <strong className="text-text">Distributed joins.</strong> Databases ship a Bloom filter of one side
              of a join to the nodes holding the other side, so they can drop rows that can&apos;t match before
              sending them over the network.
            </li>
          </ul>
          <p>
            All of these use the same k-hashes-into-an-array idea as a{" "}
            <TopicLink slug="hashing">hash table</TopicLink>. The difference is that a Bloom filter drops the keys
            to save space, which is why it can say &ldquo;definitely not&rdquo; but never &ldquo;definitely
            yes&rdquo;.
          </p>
        </Section>
      </div>

      <TableOfContents sections={SECTIONS} />
    </div>
  );
}
