import { Button } from "@/components/simulation/button";

import { SCENARIOS } from "../_lib/scenarios";
import type {
  ConsumerPattern,
  OrderingNeed,
  ReplayNeed,
  Requirements,
  RetentionNeed,
  RoutingComplexity,
  ThroughputTier,
} from "../_lib/types";

type TraitRowProps<T extends string> = {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
};

function TraitRow<T extends string>({ label, value, options, onChange }: TraitRowProps<T>) {
  return (
    <div>
      <p className="text-[11px] text-text-faint">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <Button key={opt.value} active={value === opt.value} onClick={() => onChange(opt.value)}>
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** The six-trait toggle panel that drives `recommend()`. Six small, independent decisions — not a single "which one is better" slider. */
export function RequirementControls({
  requirements,
  onChange,
}: {
  requirements: Requirements;
  onChange: (next: Requirements) => void;
}) {
  const set = <K extends keyof Requirements>(key: K, value: Requirements[K]) =>
    onChange({ ...requirements, [key]: value });

  return (
    <div className="space-y-3 rounded-xl border border-border bg-panel p-3">
      <TraitRow<ReplayNeed>
        label="Do consumers ever need to replay history?"
        value={requirements.replay}
        onChange={(v) => set("replay", v)}
        options={[
          { value: "none", label: "Never — process once, move on" },
          { value: "replay", label: "Yes — reprocess history later" },
        ]}
      />
      <TraitRow<RoutingComplexity>
        label="How does a message decide where it goes?"
        value={requirements.routing}
        onChange={(v) => set("routing", v)}
        options={[
          { value: "simple", label: "Flat — everyone or whoever's free" },
          { value: "complex", label: "Depends on message content" },
        ]}
      />
      <TraitRow<ThroughputTier>
        label="Traffic volume"
        value={requirements.throughput}
        onChange={(v) => set("throughput", v)}
        options={[
          { value: "moderate", label: "Moderate" },
          { value: "high", label: "Firehose-scale" },
        ]}
      />
      <TraitRow<OrderingNeed>
        label="Ordering requirement"
        value={requirements.ordering}
        onChange={(v) => set("ordering", v)}
        options={[
          { value: "none", label: "Doesn't matter" },
          { value: "per-key", label: "Per-key (per user/order/account)" },
          { value: "strict", label: "Strict, global" },
        ]}
      />
      <TraitRow<ConsumerPattern>
        label="Who's on the other end?"
        value={requirements.consumers}
        onChange={(v) => set("consumers", v)}
        options={[
          { value: "workers", label: "A pool of workers, one backlog" },
          { value: "fanout", label: "Several independent systems" },
        ]}
      />
      <TraitRow<RetentionNeed>
        label="Once a message is processed, it's..."
        value={requirements.retention}
        onChange={(v) => set("retention", v)}
        options={[
          { value: "transient", label: "Done — can be discarded" },
          { value: "durable", label: "Kept as a system of record" },
        ]}
      />
    </div>
  );
}

/** One-click presets loaded from the curated scenarios — lets a reader confirm the trait model agrees with the written analysis, or diverge from it on purpose. */
export function ScenarioPresets({
  activeSlug,
  onSelect,
}: {
  activeSlug: string | null;
  onSelect: (slug: string) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Load a real scenario</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SCENARIOS.map((s) => (
          <Button key={s.slug} active={activeSlug === s.slug} onClick={() => onSelect(s.slug)}>
            {s.title}
          </Button>
        ))}
      </div>
    </div>
  );
}
