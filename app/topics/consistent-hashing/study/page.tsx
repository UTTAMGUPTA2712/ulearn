import type { Metadata } from "next";

import { ComparisonTable } from "@/components/study/comparison-table";
import { ConceptCard } from "@/components/study/concept-card";
import { Section } from "@/components/study/section";
import { TableOfContents } from "@/components/study/table-of-contents";
import { TopicLink } from "@/components/topic/topic-link";
import { topicMetadata } from "@/lib/seo";

import { buildRing, countMoves, imbalanceOf, keyName, nodeShares, ringHash } from "../_lib/engine";

export const metadata: Metadata = topicMetadata("consistent-hashing", "study");

const SECTIONS = [
  "The problem: the modulo cache stampede",
  "The hash ring",
  "The math of minimal disruption",
  "Virtual nodes and hot spots",
  "Modulo vs ring vs rendezvous vs ranges",
  "In production: Discord and DynamoDB",
  "Beyond the basic ring",
];

/**
 * Every number on this page is computed at build time with the simulation's
 * own engine functions, over 10,000 keys, so the page and the demo can't
 * disagree.
 */
const SAMPLE = 10_000;
const HASHES = Array.from({ length: SAMPLE }, (_, i) => ringHash(keyName(i)));
const STUDY_VNODES = 100;

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function movesFor(from: number[], to: number[]) {
  const m = countMoves(
    HASHES,
    { nodes: from, ring: buildRing(from, STUDY_VNODES) },
    { nodes: to, ring: buildRing(to, STUDY_VNODES) },
  );
  return { modulo: m.modulo / SAMPLE, ring: m.ring / SAMPLE };
}

const MIGRATION_ROWS = [3, 5, 10].flatMap((n) => {
  const nodes = range(n);
  const withoutLast = nodes.slice(0, -1);
  const withOneMore = range(n + 1);
  return [
    { label: `Kill 1 of ${n}`, ideal: 1 / n, ...movesFor(nodes, withoutLast) },
    {
      label: `Add 1 to ${n}`,
      ideal: 1 / (n + 1),
      ...movesFor(nodes, withOneMore),
    },
  ];
});

const VNODE_ROWS = [1, 3, 10, 50, 100, 150].map((v) => {
  const nodes = range(5);
  const shares = [...nodeShares("ring", nodes, buildRing(nodes, v)).values()];
  return {
    v,
    imbalance: imbalanceOf(shares),
    hottest: Math.max(...shares) * nodes.length,
  };
});

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const five = MIGRATION_ROWS.find((r) => r.label === "Kill 1 of 5")!;
const oneVnode = VNODE_ROWS[0];
const hundredVnodes = VNODE_ROWS.find((r) => r.v === 100)!;

const LOOKUP_SOURCE = `// ring: every virtual node's position, sorted ascending
function ownerOf(key: string): Node {
  const h = hash(key);                       // 0 … 2³² − 1
  let i = lowerBound(ring, h);               // first v-node with pos >= h
  if (i === ring.length) i = 0;              // walked off the end: wrap to the start
  return ring[i].node;
}`;

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-panel-raised px-1 font-mono text-text">{children}</code>;
}

export default function ConsistentHashingStudyPage() {
  return (
    <div className="mx-auto flex max-w-[67rem] gap-12">
      <div className="min-w-0 max-w-3xl flex-1 space-y-8">
        <Section title="The problem: the modulo cache stampede">
          <p>
            You run a cache in front of a database, and one machine isn&apos;t enough, so you spread keys over N
            cache servers. The obvious way to pick a server is <Code>servers[hash(key) % N]</Code>: fast,
            stateless, and perfectly even. Every client computes the same answer with no coordination.
          </p>
          <p>
            Then a server dies, and N goes from 5 to 4. The remainder of <Code>hash % 4</Code>{" "}has almost nothing
            to do with <Code>hash % 5</Code>, so it isn&apos;t just the dead server&apos;s keys that move. Across{" "}
            {SAMPLE.toLocaleString("en-US")} keys, killing one of five servers sends{" "}
            <strong className="text-text">{pct(five.modulo)}</strong>{" "}of them to a different server. The dead
            server only held about 20%; the other ~60% were sitting on healthy machines, and now every client looks
            for them somewhere else.
          </p>
          <p>
            For a cache, &ldquo;somewhere else&rdquo; means a miss. Most of the cache goes cold in one step, and
            every miss falls through to the database at the same moment. The database was sized for the trickle of
            misses a warm cache lets through, not for that: this is a{" "}
            <strong className="text-text">cache stampede</strong>, and it turns one lost cache node into a database
            outage. Adding a server to relieve load does the same thing, which is worse: scaling up under pressure
            knocks over the database.
          </p>
          <p>
            The <TopicLink slug="hashing">Hashing &amp; Collisions</TopicLink>{" "}topic shows the in-memory version of
            this: resizing a hash table rehashes every key. That&apos;s fine when the buckets are array slots. It
            isn&apos;t fine when they&apos;re machines.
          </p>
        </Section>

        <Section title="The hash ring">
          <p>
            Consistent hashing (Karger et al., 1997) stops the server count from appearing in the formula at all.
            Take the whole hash space, 0 to 2³²−1, and bend it into a circle so the top wraps back to 0. Then:
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <strong className="text-text">Place each server on the ring</strong>{" "}by hashing its name.
            </li>
            <li>
              <strong className="text-text">Place each key on the same ring</strong>{" "}with the same hash.
            </li>
            <li>
              <strong className="text-text">A key belongs to the first server clockwise from it.</strong>
            </li>
          </ol>
          <pre className="overflow-x-auto rounded-xl border border-border bg-panel-raised p-4 font-mono text-xs leading-relaxed text-text">
            {LOOKUP_SOURCE}
          </pre>
          <p>
            Each server owns the arc between its predecessor and itself. When a server dies, its arc merges into
            the next server clockwise: its keys slide to that one neighbour, and every other key&apos;s
            &ldquo;first server clockwise&rdquo; is unchanged. When a server joins, it lands inside one existing
            arc and takes only the part before it. Nothing else anywhere on the ring moves.
          </p>
        </Section>

        <Section title="The math of minimal disruption">
          <div className="grid gap-3 sm:grid-cols-2">
            <ConceptCard name="The floor: K / N">
              <p>
                With K keys on N servers, a server holds about <Code>K / N</Code>{" "}of them. When it dies, those keys{" "}
                <em>must</em>{" "}move: their home is gone. So K/N is the minimum any scheme can achieve, and it&apos;s
                exactly what a ring moves. Adding a server is symmetric: it needs <Code>K / (N + 1)</Code>{" "}keys to
                carry its share, and that&apos;s all it takes.
              </p>
            </ConceptCard>
            <ConceptCard name="Modulo: K · (N − 1) / N">
              <p>
                A key stays put under <Code>% N</Code> → <Code>% (N ± 1)</Code>{" "}only when both remainders pick the
                same server, which for a well-spread hash happens about 1 time in N. So roughly{" "}
                <Code>(N − 1) / N</Code>{" "}of all keys move, and it gets <em>worse</em>{" "}as the cluster grows: 75% at
                4 nodes, 90% at 10, 99% at 100.
              </p>
            </ConceptCard>
          </div>
          <p>
            Measured over {SAMPLE.toLocaleString("en-US")} keys with the simulation&apos;s own hash, and{" "}
            {STUDY_VNODES} virtual nodes per server on the ring:
          </p>
          <ComparisonTable
            columns={["hash % N moves", "Ring moves", "Ideal (1 server's share)"]}
            rows={MIGRATION_ROWS.map((r) => ({
              label: r.label,
              values: [
                <span key="m" className="font-mono text-status-down">
                  {pct(r.modulo)}
                </span>,
                <span key="r" className="font-mono text-text">
                  {pct(r.ring)}
                </span>,
                <span key="i" className="font-mono">
                  {pct(r.ideal)}
                </span>,
              ],
            }))}
          />
          <p>
            The ring doesn&apos;t hit the ideal exactly, because a real server&apos;s share is only <em>about</em>{" "}
            1/N. How close it gets depends on the next section.
          </p>
        </Section>

        <Section title="Virtual nodes and hot spots">
          <p>
            With one position per server, arc lengths are luck. Five random points on a circle almost never split
            it into fifths: one server usually lands after a long empty stretch and owns far more than its share,
            and when a server dies, its <em>entire</em>{" "}load lands on one neighbour, which may already be the
            busiest node.
          </p>
          <p>
            The fix is <strong className="text-text">virtual nodes</strong>: hash each server onto the ring many
            times (<Code>&quot;N2#vn0&quot;</Code>, <Code>&quot;N2#vn1&quot;</Code>, …). Each server now owns many
            small arcs scattered around the circle, and the sum of many random arcs is far more predictable than
            one. A dead server&apos;s keys also scatter across many successors instead of dumping onto one. For 5
            servers:
          </p>
          <ComparisonTable
            columns={["Load std-dev (vs fair share)", "Busiest node's load"]}
            rows={VNODE_ROWS.map((r) => ({
              label: `${r.v} v-node${r.v === 1 ? "" : "s"} each`,
              values: [
                <span key="s" className="font-mono">
                  {pct(r.imbalance)}
                </span>,
                <span key="h" className="font-mono">
                  {r.hottest.toFixed(2)}× fair
                </span>,
              ],
            }))}
          />
          <p>
            Going from 1 to 100 v-nodes takes the spread from {pct(oneVnode.imbalance)} to{" "}
            {pct(hundredVnodes.imbalance)}, and the busiest node from {oneVnode.hottest.toFixed(2)}× to{" "}
            {hundredVnodes.hottest.toFixed(2)}× its fair share. Spread shrinks roughly with 1/√v, so the curve
            flattens: most of the win is in the first 50–100, which is why memcached&apos;s ketama clients use 160
            points per server and Cassandra historically used 256 tokens per node (16 by default since 4.0, paired
            with a smarter token allocator).
          </p>
          <p>
            Virtual nodes also make weighting trivial: a server with twice the memory gets twice the v-nodes. The
            cost is memory and lookup time for the ring itself (a sorted array of N × v positions, binary
            searched), which is small.
          </p>
        </Section>

        <Section title="Modulo vs ring vs rendezvous vs ranges">
          <ComparisonTable
            columns={["Naive modulo", "Consistent hashing", "Rendezvous (HRW)", "Range partitioning"]}
            rows={[
              {
                label: "How a key finds its node",
                values: [
                  "servers[hash % N]",
                  "Binary search for the next v-node clockwise",
                  "Score hash(key, server) for every server, take the highest",
                  "Look the key up in a range → node table",
                ],
              },
              {
                label: "Keys moved when one node joins/leaves",
                values: [
                  "~(N−1)/N of all keys",
                  "~1/N (one node's share)",
                  "~1/N, and only to/from that node",
                  "Only the ranges you choose to move",
                ],
              },
              {
                label: "Lookup cost",
                values: [
                  "O(1)",
                  "O(log(N·v))",
                  "O(N) hashes per key",
                  "O(log R) over R ranges, plus fetching the table",
                ],
              },
              {
                label: "Balance",
                values: [
                  "Perfect",
                  "Needs ~100+ v-nodes per node",
                  "Good with no tuning",
                  "Needs active splitting of hot ranges",
                ],
              },
              {
                label: "Shared state",
                values: [
                  "Just N",
                  "Server list (the ring is derived)",
                  "Just the server list",
                  "A metadata service everyone reads",
                ],
              },
              {
                label: "Range scans",
                values: ["No", "No", "No", "Yes, a range lives on one node"],
              },
              {
                label: "Typical use",
                values: [
                  "Fixed-size clusters, Kafka's default partitioner",
                  "Memcached clients, Cassandra, Riak, Dynamo",
                  "CDN and proxy selection, small clusters",
                  "Bigtable, HBase, Spanner, CockroachDB, managed DynamoDB",
                ],
              },
            ]}
          />
          <p>
            <strong className="text-text">Rendezvous hashing</strong>{" "}(Thaler &amp; Ravishankar, 1996) reaches the
            same minimal disruption without a ring: every client scores every server for a key and picks the
            winner. A dead server only loses the keys it was winning, and each of those goes to whichever server
            scored second for it, so they spread evenly with no virtual nodes. The catch is O(N) work per lookup,
            which is nothing for 10 servers and a lot for 10,000.
          </p>
          <p>
            <strong className="text-text">Range partitioning</strong>{" "}gives up on computing the owner and writes it
            down instead. That costs a metadata service, but it&apos;s the only option here that keeps sorted scans
            on one machine, and it lets the system split one hot range without touching any other.
          </p>
        </Section>

        <Section title="In production: Discord and DynamoDB">
          <div className="grid gap-3">
            <ConceptCard name="Discord: routing guilds and sessions">
              <p>
                Discord&apos;s real-time gateway is written in Elixir. Each guild (a Discord server) runs as a
                process on one node of a cluster, and every connected user has a session process holding their
                websocket. When a message is posted, the guild process fans it out to the sessions of everyone in
                it; when a session starts, it has to find the process for each of its guilds.
              </p>
              <p className="mt-2">
                They find it with a consistent hash ring over the guild id, so any node can compute a guild&apos;s
                home without asking a central directory, and adding or removing a node only relocates the guilds on
                its arcs rather than every guild in the cluster. Discord open-sourced the ring as{" "}
                <Code>ex_hash_ring</Code>. At their scale the ring lookup itself sits on the hottest path in the
                system, which is why they tuned it for speed rather than treating it as a detail.
              </p>
            </ConceptCard>
            <ConceptCard name="Amazon Dynamo → DynamoDB: storage shards">
              <p>
                Amazon&apos;s 2007 Dynamo paper is the textbook consistent-hashing store. Every node takes many
                &ldquo;tokens&rdquo; (virtual nodes) on the ring; each key is stored on the first N distinct
                physical nodes clockwise from it, its <em>preference list</em>, so when a node dies its keys
                already have warm replicas on exactly the neighbours that inherit its arcs. The paper also reports
                that purely random tokens made rebalancing and bootstrapping slow, and they moved to splitting the
                ring into equal-sized partitions that are assigned to nodes as whole units.
              </p>
              <p className="mt-2">
                The managed DynamoDB service took that last step further. It still hashes each item&apos;s
                partition key, but it assigns contiguous ranges of the hash space to partitions and records them in
                a routing metadata service. Partitions split when they grow too large or too hot, and move between
                hosts one at a time. That&apos;s range partitioning over hashed keys: the even spread of hashing
                plus the explicit control of a metadata table, paid for with a service that has to stay available.
              </p>
            </ConceptCard>
          </div>
        </Section>

        <Section title="Beyond the basic ring">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-text">Replication fixes the cold handover.</strong>{" "}Even a perfect ring moves
              K/N keys on a failure, and for a plain cache those are still misses. Storing each key on the next R
              nodes clockwise means the node that inherits a dead node&apos;s arc already has the data.
            </li>
            <li>
              <strong className="text-text">Bounded loads.</strong>{" "}Virtual nodes even out the hash space, not the
              traffic: one viral key is still one key. Consistent hashing with bounded loads (Mirrokni et al.,
              Google, 2016) caps every server at, say, 1.25× the average and sends overflow to the next server
              clockwise. Vimeo added it to HAProxy for exactly this reason.
            </li>
            <li>
              <strong className="text-text">Jump consistent hash.</strong>{" "}Lamping and Veach&apos;s 2014 algorithm
              needs no ring and no memory, just a few lines of arithmetic, and balances perfectly. It only works
              when servers are numbered 0…N−1 and can only be added or removed at the end, so it suits storage
              shards better than a cache fleet where any node can die.
            </li>
            <li>
              <strong className="text-text">Changing the v-node count moves keys too.</strong>{" "}Raising it adds
              positions that each take a slice of a neighbour&apos;s arc, so going from 10 to 20 per node moves
              about half the keys, even though no server came or went. Pick the count once.
            </li>
          </ul>
        </Section>
      </div>

      <TableOfContents sections={SECTIONS} />
    </div>
  );
}
