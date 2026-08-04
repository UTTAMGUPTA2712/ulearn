import type { Metadata } from "next";

import { ComparisonTable } from "@/components/study/comparison-table";
import { ConceptCard } from "@/components/study/concept-card";
import { Section } from "@/components/study/section";
import { TableOfContents } from "@/components/study/table-of-contents";

export const metadata: Metadata = {
  title: "Load Balancer · Study",
};

const SECTIONS = [
  "What a load balancer actually does",
  "Routing algorithms",
  "Failure modes, and what the load balancer should do about each",
  "DDoS traffic",
  "Layer 4 vs. Layer 7 load balancing",
];

export default function LoadBalancerStudyPage() {
  return (
    <div className="flex gap-12">
      <div className="min-w-0 max-w-3xl flex-1 space-y-8">
        <Section title="What a load balancer actually does">
          <p>
            A load balancer sits between clients and a pool of backend servers. Every
            incoming request has to be assigned to exactly one backend — that
            assignment rule is the &ldquo;algorithm&rdquo;. Switch it in the
            simulation and watch the same traffic pattern get distributed
            completely differently.
          </p>
        </Section>

        <Section title="Routing algorithms">
          <div className="grid gap-3 sm:grid-cols-2">
            <ConceptCard name="Round robin">
              Cycles through backends in fixed order: 1, 2, 3, 1, 2, 3… Simple and
              fair by request count, but blind to how long each backend takes —
              a slow backend gets the same share of traffic as a fast one.
            </ConceptCard>
            <ConceptCard name="Least connections">
              Sends each new request to whichever backend currently has the
              fewest active requests. Self-correcting: a backend that&apos;s
              falling behind naturally gets less new traffic until it catches
              up.
            </ConceptCard>
            <ConceptCard name="Weighted round robin">
              Like round robin, but backends with a higher weight get
              proportionally more requests. Used when backends have different
              capacity (a bigger instance should take more load). This
              simulation uses the same &ldquo;smooth&rdquo; weighting algorithm
              nginx uses, so traffic is interleaved rather than sent in bursts.
            </ConceptCard>
            <ConceptCard name="IP hash">
              Hashes the client&apos;s address to consistently pick the same
              backend for the same client — useful for sticky sessions. The
              catch: if the set of healthy backends changes (one goes down),
              the hash-to-backend mapping shifts for{" "}
              <em>everyone</em>, not just the clients that were using the
              failed backend. That reshuffling problem is what consistent
              hashing exists to fix.
            </ConceptCard>
            <ConceptCard name="URL hash">
              Same idea as IP hash, but keyed on the requested path instead of
              the client address — the same URL always lands on the same
              backend, which is what makes per-backend caching effective. It
              shares IP hash&apos;s reshuffling problem when the backend pool
              changes, and it doesn&apos;t give any one client session
              affinity the way IP hash does.
            </ConceptCard>
            <ConceptCard name="Random">
              Picks a backend uniformly at random for every request, no state
              kept between picks. Over enough requests it evens out about as
              well as round robin, but individual bursts can still land
              unevenly since nothing coordinates one pick with the next.
            </ConceptCard>
          </div>
        </Section>

        <Section title="Failure modes, and what the load balancer should do about each">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-text">Backend goes down</strong> — the LB
              has to detect it (usually via failed health checks) and stop
              routing to it. In the simulation this happens automatically after
              3 consecutive failed requests, mirroring how a real health check
              takes a few misses before it declares a backend dead. Toggle
              &ldquo;Kill&rdquo; to simulate a hard crash directly.
            </li>
            <li>
              <strong className="text-text">Backend is slow</strong> — the
              backend still responds, just later. This doesn&apos;t trip health
              checks on its own, which is exactly why it&apos;s dangerous: a
              slow backend keeps receiving traffic (especially under round
              robin) and its request queue backs up.
            </li>
            <li>
              <strong className="text-text">Backend returns errors</strong> —
              the connection succeeds but the response is a failure (5xx). This
              counts against the backend&apos;s consecutive-failure count the
              same as a hard failure would.
            </li>
            <li>
              <strong className="text-text">Backend is overloaded</strong> — it
              has hit its own connection limit and starts refusing new
              connections outright, rather than queuing them. Notice this can
              also happen{" "}
              <em>organically</em> in the simulation if too many concurrent
              requests land on one backend — try IP hash during a DDoS and
              watch a handful of unlucky backends drown while others sit idle.
            </li>
            <li>
              <strong className="text-text">Timeout</strong> — the backend
              never responds at all. A real LB waits until its timeout budget
              expires, then gives up and — if it&apos;s configured to — retries
              the request on a different backend. That&apos;s what the
              simulation does: one retry, then a final timeout if the retry
              also fails.
            </li>
          </ul>
        </Section>

        <Section title="DDoS traffic">
          <p>
            A denial-of-service flood looks different from normal traffic in
            two ways the simulation models directly: a much higher request
            rate, and requests coming from many distinct (often spoofed)
            source addresses rather than a handful of regular clients.
          </p>
          <p>
            The rate alone is often enough to push backends into organic
            overload regardless of algorithm. But the algorithm still matters:
            round robin and least connections spread the flood evenly across
            every backend, while IP hash — precisely because it&apos;s
            deterministic — can end up concentrating a disproportionate share
            of the flood onto whichever backends the flood&apos;s source hashes
            land on. A load balancer alone doesn&apos;t stop a DDoS; rate
            limiting and upstream filtering do that. What the LB decides is how
            gracefully the pool degrades while it&apos;s happening.
          </p>
        </Section>

        <Section title="Layer 4 vs. Layer 7 load balancing">
          <p>
            This simulation models Layer 7 behaviour: the load balancer is
            aware of individual requests, can inspect them, and decides
            per-request where traffic goes. Real load balancers actually split
            into two distinct categories based on which layer of the network
            stack they operate at:
          </p>
          <ComparisonTable
            columns={["Layer 4 (transport)", "Layer 7 (application)"]}
            rows={[
              {
                label: "Sees",
                values: ["IP address and port only", "Full request: headers, path, cookies, body"],
              },
              {
                label: "Routing granularity",
                values: ["Per TCP/UDP connection", "Per HTTP request"],
              },
              {
                label: "Can route by URL path",
                values: ["No", "Yes (e.g. /api → service A, /static → service B)"],
              },
              {
                label: "Overhead",
                values: ["Very low — just forwards packets", "Higher — has to terminate and parse the request"],
              },
              {
                label: "Typical use",
                values: [
                  "Raw throughput, non-HTTP protocols, DDoS-scale traffic",
                  "Content-aware routing, A/B testing, sticky sessions",
                ],
              },
            ]}
          />
        </Section>
      </div>

      <TableOfContents sections={SECTIONS} />
    </div>
  );
}
