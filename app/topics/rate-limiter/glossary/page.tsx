import type { Metadata } from "next";

import { ConceptCard } from "@/components/study/concept-card";
import { Section } from "@/components/study/section";

import { GLOSSARY } from "../_lib/glossary";
import { topicMetadata } from "@/lib/seo";

export const metadata: Metadata = topicMetadata("rate-limiter", "glossary");

/** Same terms as `GLOSSARY`, just grouped for a readable full-list page — the `<Term>` popovers elsewhere don't care about grouping, only about the id. */
const GROUPS: { title: string; ids: string[] }[] = [
  {
    title: "Limiting algorithms",
    ids: ["fixed-window", "sliding-window", "token-bucket", "leaky-bucket", "burst", "refill-rate", "global-limiter"],
  },
  {
    title: "Outcomes",
    ids: ["limited", "throttled", "overloaded", "blocked"],
  },
  {
    title: "Attacks",
    ids: ["slowloris", "syn-flood", "udp-amplification"],
  },
];

export default function RateLimiterGlossaryPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <p className="text-sm leading-relaxed text-text-muted">
        Every term this topic uses, defined once. Anywhere you see a word with a dotted
        underline — on Simulate or Study — hovering (or tapping, on touch) shows the same
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
