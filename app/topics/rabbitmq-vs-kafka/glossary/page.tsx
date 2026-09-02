import type { Metadata } from "next";

import { ConceptCard } from "@/components/study/concept-card";
import { Section } from "@/components/study/section";

import { GLOSSARY } from "../_lib/glossary";

export const metadata: Metadata = {
  title: "RabbitMQ vs Kafka · Glossary",
};

/** Same terms as `GLOSSARY`, just grouped for a readable full-list page — the `<Term>` popovers elsewhere don't care about grouping, only about the id. */
const GROUPS: { title: string; ids: string[] }[] = [
  {
    title: "RabbitMQ vocabulary",
    ids: ["exchange", "binding", "queue", "ack", "prefetch", "competing-consumers"],
  },
  {
    title: "Kafka vocabulary",
    ids: ["topic", "partition", "partition-key", "log", "offset", "consumer-group", "retention", "eviction", "replay", "poll-rate"],
  },
  {
    title: "Shared",
    ids: ["fanout"],
  },
];

export default function RabbitMqVsKafkaGlossaryPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <p className="text-sm leading-relaxed text-text-muted">
        Every term this topic uses, defined once. Anywhere you see a word with a dotted
        underline — on Simulate, Match or Study — hovering (or tapping, on touch) shows the same
        definition inline; this page is just the full list in one place.
      </p>

      {GROUPS.map((group) => (
        <Section key={group.title} title={group.title}>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.ids.map((id) => {
              const entry = GLOSSARY.find((e) => e.id === id);
              if (!entry) return null;
              return (
                <ConceptCard key={entry.id} name={entry.term}>
                  {entry.definition}
                </ConceptCard>
              );
            })}
          </div>
        </Section>
      ))}
    </div>
  );
}
