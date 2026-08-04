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
            the backend — run &ldquo;Simulate DDoS&rdquo; and watch the limiter&apos;s{" "}
            <code>429</code> count barely move while the API&apos;s <code>503</code> count
            climbs instead: the limiter waved every spoofed address through individually,
            and the backend paid for it. Real defenses combine both with something upstream
            of either — CDN or edge-level filtering, IP reputation, and challenge/CAPTCHA
            gating — rather than expecting one mechanism to carry the whole load.
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
