import { Button } from "@/components/simulation/button";
import { Term } from "@/components/study/term";

import { GLOSSARY } from "../_lib/glossary";
import type { Algorithm, Backend, Fault } from "../_lib/types";

const ALGORITHMS: { value: Algorithm; label: string }[] = [
  { value: "round-robin", label: "Round robin" },
  { value: "least-connections", label: "Least connections" },
  { value: "weighted", label: "Weighted" },
  { value: "ip-hash", label: "IP hash" },
  { value: "url-hash", label: "URL hash" },
  { value: "random", label: "Random" },
];

/** One-line explanation per algorithm, shown under the switch — mirrors `message-queue`'s DeliveryModeSwitch pattern instead of leaving the buttons unexplained. */
const ALGORITHM_GLOSSARY_ID: Record<Algorithm, string | null> = {
  "round-robin": "round-robin",
  "least-connections": "least-connections",
  weighted: "weighted-round-robin",
  "ip-hash": "ip-hash",
  "url-hash": "url-hash",
  random: null, // self-explanatory, and not in the glossary
};

const FAULTS: { value: Fault; label: string }[] = [
  { value: "none", label: "Healthy" },
  { value: "slow", label: "Slow" },
  { value: "erroring", label: "Erroring" },
  { value: "overloaded", label: "Overloaded" },
  { value: "timeout", label: "Timeout" },
];

export function AlgorithmSwitch({
  algorithm,
  onChange,
}: {
  algorithm: Algorithm;
  onChange: (a: Algorithm) => void;
}) {
  const glossaryId = ALGORITHM_GLOSSARY_ID[algorithm];
  const entry = glossaryId ? GLOSSARY.find((e) => e.id === glossaryId) : undefined;

  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Algorithm</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ALGORITHMS.map((a) => (
          <Button key={a.value} active={algorithm === a.value} onClick={() => onChange(a.value)}>
            {a.label}
          </Button>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-text-faint">
        {entry ? (
          <>
            <Term id={entry.id} glossary={GLOSSARY}>{entry.term}</Term>: {entry.definition}
          </>
        ) : (
          "Picks a backend uniformly at random for every request — no state to track, no pattern to reason about."
        )}
      </p>
    </div>
  );
}

export function TrafficControls({
  autoStream,
  autoStreamRate,
  ddosActive,
  onSendOne,
  onSetAutoStream,
  onSetDdos,
}: {
  autoStream: boolean;
  autoStreamRate: number;
  ddosActive: boolean;
  onSendOne: () => void;
  onSetAutoStream: (enabled: boolean, rate?: number) => void;
  onSetDdos: (active: boolean) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Traffic</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Button primary onClick={onSendOne}>Send one request</Button>
        <Button active={autoStream} onClick={() => onSetAutoStream(!autoStream)}>
          {autoStream ? "Stop auto-stream" : "Start auto-stream"}
        </Button>
        {autoStream && (
          <label className="flex items-center gap-1.5 text-sm text-text-muted">
            rate
            <input
              type="range"
              min={1}
              max={10}
              value={autoStreamRate}
              onChange={(e) => onSetAutoStream(true, Number(e.target.value))}
              className="accent-accent"
            />
            <span className="font-mono">{autoStreamRate}/s</span>
          </label>
        )}
        <Button danger active={ddosActive} onClick={() => onSetDdos(!ddosActive)} className="ml-auto">
          {ddosActive ? "Stop DDoS" : "Simulate DDoS"}
        </Button>
      </div>
      {ddosActive && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-text-faint">
          Flooding from thousands of spoofed IPs — a{" "}
          <Term id="ddos" glossary={GLOSSARY}>DDoS</Term> spreads across backends same as any
          other traffic; a load balancer alone can&apos;t tell it apart from real demand.
        </p>
      )}
    </div>
  );
}

export function BackendControls({
  algorithm,
  backends,
  onToggleHealthy,
  onSetFault,
  onSetWeight,
}: {
  algorithm: Algorithm;
  backends: Backend[];
  onToggleHealthy: (id: string) => void;
  onSetFault: (id: string, fault: Fault) => void;
  onSetWeight: (id: string, weight: number) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Backends</p>
      <p className="mt-1 text-[11px] leading-relaxed text-text-faint">
        A <Term id="health-check" glossary={GLOSSARY}>health check</Term> auto-
        <Term id="mark-down" glossary={GLOSSARY}>marks a backend down</Term> after repeated
        failures — &ldquo;Kill&rdquo; simulates an outage happening in the first place.
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {backends.map((backend) => (
          <div key={backend.id} className="rounded-xl border border-border bg-panel p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text">{backend.label}</span>
              <Button danger={backend.healthy} active={!backend.healthy} onClick={() => onToggleHealthy(backend.id)}>
                {backend.healthy ? "Kill" : "Revive"}
              </Button>
            </div>

            {algorithm === "weighted" && (
              <label className="mt-2 flex items-center gap-2 text-[11px] text-text-muted">
                weight
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={backend.weight}
                  onChange={(e) => onSetWeight(backend.id, Number(e.target.value))}
                  className="min-w-0 flex-1 accent-accent"
                  disabled={!backend.healthy}
                />
                <span className="font-mono">{backend.weight}</span>
              </label>
            )}

            <div className="mt-2 flex flex-wrap gap-1">
              {FAULTS.map((f) => (
                <Button
                  key={f.value}
                  active={backend.fault === f.value}
                  danger={f.value !== "none"}
                  onClick={() => onSetFault(backend.id, f.value)}
                  disabled={!backend.healthy}
                  className="px-2 py-0.5 text-[10px]"
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
