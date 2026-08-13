import type { Metadata } from "next";

import { ComparisonTable } from "@/components/study/comparison-table";
import { ConceptCard } from "@/components/study/concept-card";
import { Section } from "@/components/study/section";
import { TableOfContents } from "@/components/study/table-of-contents";

export const metadata: Metadata = {
  title: "Rate Limiter · Study",
};

const SECTIONS = [
  "What a rate limiter actually does",
  "Throttling algorithms",
  "Keying: who is \"one client\"?",
  "Rate limiting vs. a DDoS",
  "Not every attack reaches the rate limiter",
];

export default function RateLimiterStudyPage() {
  return (
    <div className="mx-auto flex max-w-[67rem] gap-12">
      <div className="min-w-0 max-w-3xl flex-1 space-y-8">
        <Section title="What a rate limiter actually does">
          <p>
            A rate limiter sits in front of an API and decides, per request, whether the
            caller has budget left — if not, it rejects the request immediately with a{" "}
            <code>429 Too Many Requests</code> instead of letting it reach the backend at
            all. Where a load balancer decides <em>which</em> backend handles a request,
            a rate limiter decides <em>whether</em> it gets handled at all.
          </p>
        </Section>

        <Section title="Throttling algorithms">
          <div className="grid gap-3 sm:grid-cols-2">
            <ConceptCard name="Fixed window">
              Counts requests in a fixed-size time bucket (e.g. one 4-second window) and
              resets to zero when the window rolls over. Simple and cheap, but bursty at
              the edges — a client can spend its whole budget in the last instant of one
              window and again in the first instant of the next, doubling its effective
              rate right at the boundary.
            </ConceptCard>
            <ConceptCard name="Sliding window">
              Keeps a log of recent request timestamps and only counts the ones still
              inside the trailing window, so the window moves with every request instead
              of resetting on a fixed clock tick. Fixes the boundary-burst problem, at the
              cost of remembering every timestamp rather than a single counter.
            </ConceptCard>
            <ConceptCard name="Token bucket">
              Each client has a bucket of tokens, refilled continuously up to a capacity.
              A request costs one token; no tokens, no request. Refilling continuously
              (rather than resetting all at once) is what lets it absorb a short burst —
              up to a full bucket&apos;s worth — while still capping the long-run average
              rate.
            </ConceptCard>
            <ConceptCard name="Leaky bucket">
              The mirror image of token bucket: requests fill the bucket up, and it drains
              at a steady rate on its own. If a request would overflow the bucket, it&apos;s
              rejected. Where token bucket smooths the rate a client is <em>allowed</em>{" "}
              to send at, leaky bucket smooths the rate the backend actually{" "}
              <em>sees</em> — bursts get queued and released steadily rather than passed
              straight through.
            </ConceptCard>
          </div>
        </Section>

        <Section title="Keying: who is &ldquo;one client&rdquo;?">
          <p>
            Every algorithm above needs a key to count against — usually the caller&apos;s
            IP address, an API key, or an authenticated user ID. The simulation keys by IP.
            Try &ldquo;Hammer one client&rdquo;: it fires a burst of requests from a single
            fixed address and you&apos;ll watch that address get throttled correctly once it
            exceeds the limit, while every other client keeps its own separate budget
            untouched.
          </p>
          <p>
            That per-key isolation is also the mechanism&apos;s biggest weakness. It only
            works if one attacker maps to one key. An API key or logged-in user ID is hard
            to fake, but a source IP is not — the &ldquo;Simulate DDoS&rdquo; button spreads
            requests across thousands of spoofed addresses, and per-IP limiting lets nearly
            all of them through, because each spoofed IP looks like a brand-new caller with
            a full, untouched quota.
          </p>
        </Section>

        <Section title="Rate limiting vs. a DDoS">
          <p>
            This is the same conclusion the load balancer&apos;s DDoS section reaches from
            the other direction: no single layer stops a distributed flood on its own. A
            load balancer keeps spreading a flood evenly across healthy backends right up
            until they all fall over. A rate limiter keyed by IP keeps every individual
            spoofed address under its limit while the aggregate request rate still floods
            the backend — run the <strong>HTTP Flood</strong>{" "}attack and watch the
            limiter&apos;s <code>429</code> count barely move while the API&apos;s{" "}
            <code>503</code> count climbs instead: the limiter waved every spoofed address
            through individually, and the backend paid for it. Notice the client node itself
            during the run, too — it sprouts a ring of satellite dots and a distinct-IP
            counter, because the flood isn&apos;t one machine sending a lot of traffic, it&apos;s
            thousands of different ones, each looking like a legitimate first-time caller.
          </p>
          <p>
            Now turn on the <strong>server-wide limiter</strong>{" "}and run the same flood
            again. It sits behind the per-client limiter and shares one bucket across every
            client and spoofed address combined, so rotating source IPs no longer buys the
            attacker anything — the aggregate rate hits a wall regardless of how many
            identities it&apos;s spread across. Watch the new node&apos;s own{" "}
            <code>429</code> count climb instead of the API&apos;s <code>503</code>s: traffic
            gets throttled deliberately, before the backend is ever put at risk, rather than
            dropped after the fact by running out of capacity. Real systems layer this same
            idea with something further upstream too — CDN or edge-level filtering, IP
            reputation, and challenge/CAPTCHA gating — rather than expecting any one
            mechanism to carry the whole load.
          </p>
        </Section>

        <Section title="Not every attack reaches the rate limiter">
          <p>
            &ldquo;DDoS&rdquo; is not one attack, and the four options in the simulator split
            cleanly into two groups. HTTP Flood and Slowloris are application-layer attacks —
            real traffic arriving over HTTP, visible in this diagram, putting load on this
            API. SYN Flood and UDP Amplification operate below that: run either one and watch
            the packets flash and disappear at the dashed &ldquo;network&rdquo; edge, left of
            the client node — they never enter the pipeline at all, because there&apos;s no
            HTTP request for a rate limiter to inspect in the first place. A SYN flood never
            finishes the TCP handshake; UDP amplification just reflects volume off third-party
            servers to saturate your bandwidth. Both are stopped upstream, if at all — by the
            OS network stack (SYN cookies), a firewall, or a CDN scrubbing traffic before it
            reaches you — not by anything an application can configure.
          </p>
          <p>
            Slowloris is the more interesting case precisely because it{" "}
            <em>does</em> reach the app layer but still slips past both limiters here. It
            never sends a complete request, so a limiter that counts completed requests has
            nothing to count — run it and watch it skip straight past the{" "}
            <code>Rate limiter</code>{" "}and <code>Server limiter</code>{" "}nodes entirely, heading
            for the API&apos;s <code>held</code>{" "}connection-slot gauge instead. Enough
            simultaneous slow connections exhaust that pool just as effectively as a flood
            exhausts request-processing capacity, and no amount of per-request rate-limit
            tuning touches it — the actual fix is a connection or header-read timeout that
            kills a socket that&apos;s stalled too long, a different mechanism for a different
            resource.
          </p>
        </Section>

        <ComparisonTable
          columns={["Fixed / sliding window", "Token bucket", "Leaky bucket"]}
          rows={[
            { label: "Allows bursts", values: ["Yes, up to the limit", "Yes, up to bucket capacity", "No — smooths output"] },
            { label: "Memory per client", values: ["One counter (fixed) or a timestamp log (sliding)", "One float (token count)", "One float (queue level)"] },
            { label: "Output rate to backend", values: ["Uneven — can spike at window edges", "Uneven — bursty within capacity", "Steady, capped at the leak rate"] },
            { label: "Typical use", values: ["Simple API quotas", "Client-facing APIs that tolerate bursts", "Protecting a backend that can't handle spikes"] },
          ]}
        />
      </div>

      <TableOfContents sections={SECTIONS} />
    </div>
  );
}
