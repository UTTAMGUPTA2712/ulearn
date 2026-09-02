import { Button } from "@/components/simulation/button";
import { Term } from "@/components/study/term";

import { GLOSSARY } from "../_lib/glossary";
import type { Algorithm, AttackType, ClientState } from "../_lib/types";

const ALGORITHMS: { value: Algorithm; label: string }[] = [
  { value: "fixed-window", label: "Fixed window" },
  { value: "sliding-window", label: "Sliding window" },
  { value: "token-bucket", label: "Token bucket" },
  { value: "leaky-bucket", label: "Leaky bucket" },
];

/** Every algorithm value here doubles as its own glossary id — see `_lib/glossary.ts`. */
const ALGORITHM_GLOSSARY_ID: Record<Algorithm, string> = {
  "fixed-window": "fixed-window",
  "sliding-window": "sliding-window",
  "token-bucket": "token-bucket",
  "leaky-bucket": "leaky-bucket",
};

function remaining(client: ClientState, algorithm: Algorithm, limit: number): number {
  switch (algorithm) {
    case "fixed-window":
      return limit - client.windowCount;
    case "sliding-window":
      return limit - client.log.length;
    case "token-bucket":
      return client.tokens;
    case "leaky-bucket":
      return limit - client.level;
  }
}

export function AlgorithmSwitch({
  algorithm,
  onChange,
}: {
  algorithm: Algorithm;
  onChange: (a: Algorithm) => void;
}) {
  const entry = GLOSSARY.find((e) => e.id === ALGORITHM_GLOSSARY_ID[algorithm]);

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
      {entry && (
        <p className="mt-2 text-[11px] leading-relaxed text-text-faint">
          <Term id={entry.id} glossary={GLOSSARY}>{entry.term}</Term>: {entry.definition}
        </p>
      )}
    </div>
  );
}

export function LimiterConfig({
  algorithm,
  limit,
  windowMs,
  refillRate,
  onSetLimit,
  onSetWindowMs,
  onSetRefillRate,
}: {
  algorithm: Algorithm;
  limit: number;
  windowMs: number;
  refillRate: number;
  onSetLimit: (limit: number) => void;
  onSetWindowMs: (ms: number) => void;
  onSetRefillRate: (rate: number) => void;
}) {
  const isWindowBased = algorithm === "fixed-window" || algorithm === "sliding-window";
  const isBucketBased = algorithm === "token-bucket" || algorithm === "leaky-bucket";

  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Limiter config</p>
      <div className="mt-2 space-y-2.5 rounded-xl border border-border bg-panel p-3">
        <label className="flex items-center gap-2 text-[11px] text-text-muted">
          {isBucketBased ? "capacity" : "limit"}
          <input
            type="range"
            min={1}
            max={20}
            value={limit}
            onChange={(e) => onSetLimit(Number(e.target.value))}
            className="min-w-0 flex-1 accent-accent"
          />
          <span className="w-6 shrink-0 text-right font-mono">{limit}</span>
        </label>

        {isWindowBased && (
          <label className="flex items-center gap-2 text-[11px] text-text-muted">
            window
            <input
              type="range"
              min={1000}
              max={10000}
              step={500}
              value={windowMs}
              onChange={(e) => onSetWindowMs(Number(e.target.value))}
              className="min-w-0 flex-1 accent-accent"
            />
            <span className="w-8 shrink-0 text-right font-mono">{(windowMs / 1000).toFixed(1)}s</span>
          </label>
        )}

        {isBucketBased && (
          <label className="flex items-center gap-2 text-[11px] text-text-muted">
            <Term id="refill-rate" glossary={GLOSSARY}>
              {algorithm === "token-bucket" ? "refill rate" : "leak rate"}
            </Term>
            <input
              type="range"
              min={1}
              max={10}
              value={refillRate}
              onChange={(e) => onSetRefillRate(Number(e.target.value))}
              className="min-w-0 flex-1 accent-accent"
            />
            <span className="w-10 shrink-0 text-right font-mono">{refillRate}/s</span>
          </label>
        )}
      </div>
    </div>
  );
}

export function TrafficControls({
  autoStream,
  autoStreamRate,
  onSendOne,
  onHammerClient,
  onSetAutoStream,
}: {
  autoStream: boolean;
  autoStreamRate: number;
  onSendOne: () => void;
  onHammerClient: () => void;
  onSetAutoStream: (enabled: boolean, rate?: number) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Traffic</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Button primary onClick={onSendOne}>Send one request</Button>
        <Button onClick={onHammerClient}>Hammer one client</Button>
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
      </div>
    </div>
  );
}

/** `glossaryId` is set only for attacks that also have a full definition in `_lib/glossary.ts`. */
const ATTACKS: { value: AttackType; label: string; glossaryId?: string; reaches: boolean; description: string }[] = [
  {
    value: "http-flood",
    label: "HTTP Flood",
    reaches: true,
    description: "Completes real requests from thousands of spoofed IPs — reaches the limiter, which waves each one through individually.",
  },
  {
    value: "slowloris",
    label: "Slowloris",
    glossaryId: "slowloris",
    reaches: true,
    description: "Opens connections but never finishes a request — nothing for a request-counting limiter to see, so it bypasses both limiters and ties up raw connection slots instead.",
  },
  {
    value: "syn-flood",
    label: "SYN Flood",
    glossaryId: "syn-flood",
    reaches: false,
    description: "Never completes a TCP handshake — there's no HTTP request, so it never reaches this diagram's rate limiter at all. Handled by the OS/network stack (SYN cookies, firewalls).",
  },
  {
    value: "udp-amplification",
    label: "UDP Amplification",
    glossaryId: "udp-amplification",
    reaches: false,
    description: "Pure volumetric traffic aimed at saturating bandwidth upstream of the server — no rate limiter here has any visibility into it. Needs edge/CDN-level scrubbing.",
  },
];

export function AttackControls({
  activeAttack,
  onSetAttack,
}: {
  activeAttack: AttackType | null;
  onSetAttack: (attack: AttackType | null) => void;
}) {
  const current = ATTACKS.find((a) => a.value === activeAttack);

  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Attack simulation</p>
      <div className="mt-2 space-y-2.5 rounded-xl border border-border bg-panel p-3">
        <div className="flex flex-wrap gap-1.5">
          {ATTACKS.map((a) => (
            <Button
              key={a.value}
              danger
              active={activeAttack === a.value}
              onClick={() => onSetAttack(activeAttack === a.value ? null : a.value)}
            >
              {a.label}
            </Button>
          ))}
        </div>
        {current ? (
          <p className="text-[11px] text-text-muted">
            {current.glossaryId && (
              <>
                <Term id={current.glossaryId} glossary={GLOSSARY}>{current.label}</Term>
                {" — "}
              </>
            )}
            <span className={current.reaches ? "text-status-down" : "text-status-active"}>
              {current.reaches ? "Reaches the limiter — " : "Never reaches the app layer — "}
            </span>
            {current.description}
          </p>
        ) : (
          <p className="text-[11px] text-text-faint">
            Pick an attack type. HTTP Flood and Slowloris are HTTP-layer floods this diagram can
            actually route; SYN Flood and UDP Amplification operate below the HTTP layer and never
            reach a rate limiter at all — watch them get intercepted at the network edge instead.
          </p>
        )}
      </div>
    </div>
  );
}

export function GlobalLimiterConfig({
  active,
  capacity,
  refillRate,
  onSetActive,
  onSetCapacity,
  onSetRefillRate,
}: {
  active: boolean;
  capacity: number;
  refillRate: number;
  onSetActive: (active: boolean) => void;
  onSetCapacity: (capacity: number) => void;
  onSetRefillRate: (rate: number) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">
        <Term id="global-limiter" glossary={GLOSSARY}>Server-wide limiter</Term>
      </p>
      <div className="mt-2 space-y-2.5 rounded-xl border border-border bg-panel p-3">
        <Button active={active} onClick={() => onSetActive(!active)} className="w-full">
          {active ? "Disable server-wide limit" : "Enable server-wide limit"}
        </Button>
        {active && (
          <>
            <label className="flex items-center gap-2 text-[11px] text-text-muted">
              <Term id="burst" glossary={GLOSSARY}>burst</Term> capacity
              <input
                type="range"
                min={1}
                max={50}
                value={capacity}
                onChange={(e) => onSetCapacity(Number(e.target.value))}
                className="min-w-0 flex-1 accent-accent"
              />
              <span className="w-6 shrink-0 text-right font-mono">{capacity}</span>
            </label>
            <label className="flex items-center gap-2 text-[11px] text-text-muted">
              sustained rate
              <input
                type="range"
                min={1}
                max={60}
                value={refillRate}
                onChange={(e) => onSetRefillRate(Number(e.target.value))}
                className="min-w-0 flex-1 accent-accent"
              />
              <span className="w-10 shrink-0 text-right font-mono">{refillRate}/s</span>
            </label>
          </>
        )}
      </div>
    </div>
  );
}

export function ClientList({
  algorithm,
  limit,
  clients,
}: {
  algorithm: Algorithm;
  limit: number;
  clients: ClientState[];
}) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Clients</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {clients.map((client) => {
          const left = Math.max(0, Math.min(limit, remaining(client, algorithm, limit)));
          const fraction = limit > 0 ? left / limit : 0;

          return (
            <div key={client.clientId} className="rounded-xl border border-border bg-panel p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-text">{client.clientId}</span>
                <span className="font-mono text-[10px] text-text-faint">
                  {left.toFixed(algorithm === "token-bucket" || algorithm === "leaky-bucket" ? 1 : 0)}/{limit} left
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-border">
                <div
                  className="h-1.5 rounded-full transition-[width]"
                  style={{
                    width: `${fraction * 100}%`,
                    background: fraction > 0.2 ? "var(--status-up)" : "var(--status-down)",
                  }}
                />
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[10px] text-text-faint">
                <span className="text-status-up">{client.allowed} allowed</span>
                <span className="text-status-down">{client.limited} limited</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
