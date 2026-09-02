import type { GlossaryEntry } from "@/components/study/term";

/**
 * Single source of truth for every term this topic uses across Simulate and
 * Study. The `/glossary` tab renders this whole list; every inline `<Term>`
 * popover elsewhere looks a definition up from this same array.
 */
export const GLOSSARY: GlossaryEntry[] = [
  {
    id: "ack",
    term: "Ack (acknowledgment)",
    definition:
      "A consumer's explicit signal that it actually finished processing a message — not just received it. Only once a message is acked does the broker consider it done.",
  },
  {
    id: "visibility-timeout",
    term: "Visibility timeout",
    definition:
      "How long the broker waits after handing a message to a consumer, with no ack, before assuming that consumer died and making the message visible to other consumers again.",
  },
  {
    id: "redelivery",
    term: "Redelivery",
    definition:
      "Handing a message to a different consumer after its visibility timeout expires without an ack — the broker's way of recovering from a consumer that crashed mid-job.",
  },
  {
    id: "backpressure",
    term: "Backpressure",
    definition:
      "What the broker does once its backlog is full: either drop new messages outright, or pause the producer until a consumer frees up room. Both policies protect the broker from unbounded growth — they just fail differently.",
  },
  {
    id: "dead-letter-queue",
    term: "Dead-letter queue (DLQ)",
    definition:
      "A separate backlog a message moves to after it's failed (or its consumer crashed) too many times to keep retrying. It's the thing you actually monitor in production — a climbing DLQ count means something is systematically broken.",
  },
  {
    id: "work-queue",
    term: "Work queue (competing consumers)",
    definition:
      "One shared backlog where each message is delivered to exactly one consumer — whichever is free first. A pool of workers splitting up discrete jobs.",
  },
  {
    id: "fanout",
    term: "Fan-out (pub/sub)",
    definition:
      "Every consumer gets its own full copy of every message, and keeps its own backlog if it falls behind — as opposed to a work queue, where each message goes to only one consumer.",
  },
  {
    id: "max-retries",
    term: "Max retries",
    definition:
      "How many times a failed message gets redelivered before the broker gives up and sends it to the dead-letter queue instead of trying again forever.",
  },
];
