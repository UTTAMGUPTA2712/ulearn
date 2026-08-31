"use client";

import { useMemo, useState } from "react";

import { recommend } from "../_lib/recommend";
import { SCENARIOS } from "../_lib/scenarios";
import type { Requirements } from "../_lib/types";
import { RequirementControls, ScenarioPresets } from "./controls";
import { ComparisonDiagram } from "./diagram";
import { ResultPanel } from "./result-panel";

/** Opens on the classic job-queue scenario so there's an immediate, legible result instead of a blank slate. */
const INITIAL_SCENARIO = SCENARIOS[0];

export function BrokerMatcher() {
  const [requirements, setRequirements] = useState<Requirements>(INITIAL_SCENARIO.requirements);
  const [activeScenarioSlug, setActiveScenarioSlug] = useState<string | null>(INITIAL_SCENARIO.slug);

  const recommendation = useMemo(() => recommend(requirements), [requirements]);

  const handleRequirementsChange = (next: Requirements) => {
    setRequirements(next);
    // Any manual toggle means the reader has moved past the preset — stop
    // implying the current combo still matches a curated scenario.
    setActiveScenarioSlug(null);
  };

  const handleScenarioSelect = (slug: string) => {
    const scenario = SCENARIOS.find((s) => s.slug === slug);
    if (!scenario) return;
    setRequirements(scenario.requirements);
    setActiveScenarioSlug(slug);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-4">
        <div className="h-[340px] shrink-0 rounded-2xl border border-border bg-panel p-3 shadow-sm">
          <ComparisonDiagram
            leader={recommendation.leader}
            routingComplex={requirements.routing === "complex"}
            fanout={requirements.consumers === "fanout"}
          />
        </div>
        <ResultPanel recommendation={recommendation} />
      </div>

      <div className="flex flex-col gap-6">
        <ScenarioPresets activeSlug={activeScenarioSlug} onSelect={handleScenarioSelect} />
        <div>
          <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">
            Or describe your own workload
          </p>
          <div className="mt-2">
            <RequirementControls requirements={requirements} onChange={handleRequirementsChange} />
          </div>
        </div>
      </div>
    </div>
  );
}
