import { cn } from "@/lib/utils/cn";

import type { Scenario } from "../_lib/types";

const BADGE_LABEL = { rabbitmq: "RabbitMQ", kafka: "Kafka", either: "Either works" } as const;

/** One curated use case in full — the "very detailed, explicitly why" content this topic is built around. Not a `ConceptCard`: it needs a recommendation badge and two distinct reasoning paragraphs, which is a genuinely different shape. */
export function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const isDefinitive = scenario.recommendation !== "either";
  return (
    <div className="rounded-xl border border-border bg-panel p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-base font-medium text-text">{scenario.title}</h3>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
            isDefinitive ? "border-accent bg-accent/10 text-accent" : "border-border text-text-faint",
          )}
        >
          {BADGE_LABEL[scenario.recommendation]}
        </span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{scenario.shape}</p>

      <div className="mt-3 space-y-2.5 border-t border-border pt-3 text-sm leading-relaxed">
        <p className="text-text-muted">
          <strong className="text-text">Why: </strong>
          {scenario.why}
        </p>
        <p className="text-text-muted">
          <strong className="text-text">
            {isDefinitive ? "The other one, here:" : "The trap:"}{" "}
          </strong>
          {scenario.whyNotOther}
        </p>
      </div>
    </div>
  );
}
