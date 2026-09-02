import type { GlossaryEntry } from "@/components/study/term";

/**
 * Single source of truth for every term this topic uses across Simulate and
 * Study. The `/glossary` tab renders this whole list; every inline `<Term>`
 * popover elsewhere looks a definition up from this same array.
 */
export const GLOSSARY: GlossaryEntry[] = [
  {
    id: "fixed-window",
    term: "Fixed window",
    definition:
      "Counts requests in a fixed-size time slot (e.g. per minute) and resets to zero when the window rolls over. Simple and cheap, but bursty right at the boundary — a client can send a full window's worth of requests right before a reset and another full window's worth right after.",
  },
  {
    id: "sliding-window",
    term: "Sliding window",
    definition:
      "Counts requests in a trailing window that moves continuously with the current time, instead of resetting on a fixed clock tick. Fixes the fixed-window's boundary-burst problem, at the cost of tracking individual request timestamps.",
  },
  {
    id: "token-bucket",
    term: "Token bucket",
    definition:
      "Each client has a bucket of tokens, refilled continuously up to a capacity; every request spends one token. Refilling continuously (rather than resetting all at once) is what lets it absorb a short burst up to the bucket's capacity, then settle into the steady refill rate.",
  },
  {
    id: "leaky-bucket",
    term: "Leaky bucket",
    definition:
      "Requests fill a bucket that drains continuously at a fixed rate; a request that would overflow the bucket is rejected. Unlike token bucket, it smooths the rate the backend actually sees — bursts get queued and released steadily rather than passed straight through.",
  },
  {
    id: "burst",
    term: "Burst",
    definition:
      "A short spike of requests arriving faster than the sustained rate. How well a limiter tolerates a burst — versus rejecting it outright — is one of the main things that actually separates these algorithms.",
  },
  {
    id: "refill-rate",
    term: "Refill / leak rate",
    definition:
      "How fast a token bucket refills, or a leaky bucket drains — the sustained requests-per-second rate the limiter settles into once any burst capacity is used up.",
  },
  {
    id: "global-limiter",
    term: "Server-wide (global) limiter",
    definition:
      "A second limit applied across every client combined, sitting after the per-client limiter. Protects the server itself from being overwhelmed by many clients each individually staying under their own limit.",
  },
  {
    id: "limited",
    term: "Limited (429)",
    definition:
      "Rejected by the per-client rate limiter — this one client alone exceeded its own allowance.",
  },
  {
    id: "throttled",
    term: "Throttled (429, global)",
    definition:
      "Passed the per-client limiter fine, but rejected by the server-wide limiter because combined traffic from all clients exceeded the server's total capacity.",
  },
  {
    id: "overloaded",
    term: "Overloaded (503)",
    definition:
      "Passed every rate limiter but got dropped anyway because the API itself was saturated — rate limiting controls how much traffic gets through, not how much the backend can actually handle once it does.",
  },
  {
    id: "blocked",
    term: "Blocked (network layer)",
    definition:
      "Never became an HTTP request in the first place — stopped at the network/protocol layer (SYN flood, UDP amplification) before a rate limiter, which only sees HTTP requests, ever had a chance to look at it.",
  },
  {
    id: "slowloris",
    term: "Slowloris",
    definition:
      "An attack that opens many connections but never finishes sending a request. A request-counting rate limiter has nothing to count — the attack ties up raw connection slots instead of tripping any request limit.",
  },
  {
    id: "syn-flood",
    term: "SYN flood",
    definition:
      "Sends TCP handshake-initiation packets and never completes the handshake, exhausting connection resources before an HTTP request ever exists. Handled below the application layer — SYN cookies, firewalls — not by a rate limiter.",
  },
  {
    id: "udp-amplification",
    term: "UDP amplification",
    definition:
      "Sends small spoofed UDP requests to third-party servers that reply with much larger responses aimed at the victim — pure volumetric traffic with no HTTP request involved at all. Needs edge/CDN-level scrubbing, not a rate limiter.",
  },
];
