import type { Metadata } from "next";

import { ConceptCard } from "@/components/study/concept-card";
import { Section } from "@/components/study/section";

import { GLOSSARY } from "../_lib/glossary";

export const metadata: Metadata = {
  title: "Load Balancer · Glossary",
};

export default function LoadBalancerGlossaryPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <p className="text-sm leading-relaxed text-text-muted">
        Every term this topic uses, defined once. Anywhere you see a word with a dotted
        underline — on Simulate or Study — hovering (or tapping, on touch) shows the same
        definition inline; this page is just the full list in one place.
      </p>

      <Section title="Terms">
        <div className="grid gap-3 sm:grid-cols-2">
          {GLOSSARY.map((entry) => (
            <ConceptCard key={entry.id} name={entry.term}>
              {entry.definition}
            </ConceptCard>
          ))}
        </div>
      </Section>
    </div>
  );
}
