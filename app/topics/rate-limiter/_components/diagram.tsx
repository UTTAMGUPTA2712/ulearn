import type { AttackType, BlockedPacket, RequestPacket } from "../_lib/types";

const VIEW_W = 720;
// 30px taller than the routing topology needs, purely for the legend row at
// the bottom — every node position below is computed off VIEW_H/2, so this
// stays safe without touching any of them.
const VIEW_H = 450;
const LEGEND_Y = VIEW_H - 14;

/** Explains what each request-packet dot color and stroke means — without it the animation is just colored motion. Node-level counters (429 ×, held N/capacity) are already labeled inline, so they don't need a legend entry. */
const LEGEND_ITEMS: { x: number; color: string; label: string; ring?: boolean }[] = [
  { x: 20, color: "var(--status-active)", label: "in flight" },
  { x: 110, color: "var(--status-up)", label: "allowed" },
  { x: 200, color: "var(--status-down)", label: "limited (429)" },
  { x: 330, color: "var(--status-warn)", label: "overloaded (503)" },
  { x: 480, color: "var(--status-down)", label: "attack traffic", ring: true },
];

const NETWORK_EDGE = { x: 20, y: VIEW_H / 2 };
const CLIENT = { x: 60, y: VIEW_H / 2 };
const LIMITER = { x: 330, y: VIEW_H / 2 };
const GLOBAL = { x: 505, y: VIEW_H / 2 };
const API = { x: 655, y: VIEW_H / 2 };

/** How long a blocked network-layer flash stays visible — must match the engine's BLOCKED_LIFETIME_MS. */
const BLOCKED_LIFETIME_MS = 420;

/** Deterministic scatter for Slowloris connections parked around the API node — golden angle avoids visible banding. */
function heldOffset(id: number) {
  const angle = id * 2.399963;
  const radius = 48 + (id % 3) * 9;
  return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
}

/**
 * Ring of faint satellite dots around a node, standing in for the many
 * distinct spoofed addresses a flood is coming from. Without this the
 * diagram's single "clients" circle makes a distributed attack look like
 * one machine sending a lot of traffic.
 */
function AttackSwarm({ cx, cy, radius = 34 }: { cx: number; cy: number; radius?: number }) {
  const dots = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * Math.PI * 2;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });
  return (
    <>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={2.5} fill="var(--status-down)" opacity={0.35} />
      ))}
    </>
  );
}

/** Rejection is never one color — where it happened is the whole point. */
const OUTCOME_COLOR: Record<string, string> = {
  limited: "var(--status-down)",
  throttled: "var(--status-active)",
  overloaded: "var(--status-warn)",
  allowed: "var(--status-up)",
};

/** Where a "returning" packet bounced from — the node that produced its outcome. */
function returnOrigin(outcome: string | null) {
  switch (outcome) {
    case "limited":
      return LIMITER;
    case "throttled":
      return GLOBAL;
    default:
      return API; // overloaded or allowed both make it all the way to the API
  }
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const NODE_COORDS: Record<string, { x: number; y: number }> = {
  client: CLIENT,
  limiter: LIMITER,
  global: GLOBAL,
  api: API,
};

function packetPosition(
  req: RequestPacket,
  now: number,
  globalActive: boolean,
): { x: number; y: number; color: string; opacity: number } {
  const t = Math.min(1, Math.max(0, (now - req.phaseStart) / req.phaseDuration));
  const eased = easeOutCubic(t);
  // Attack traffic is red the whole way through, not just outlined at the
  // end — legitimate requests stay cyan so the flood is visible in flight.
  const transitColor = req.isDdos ? "var(--status-down)" : "var(--status-active)";

  if (req.fromNode && req.toNode) {
    const fromCoord = NODE_COORDS[req.fromNode];
    const toCoord = NODE_COORDS[req.toNode];
    const color =
      req.phase === "returning" || req.phase === "done"
        ? OUTCOME_COLOR[req.outcome ?? "allowed"]
        : transitColor;
    const opacity = req.phase === "done" ? 1 - t : 1;

    if (req.phase === "held") {
      const { dx, dy } = heldOffset(req.id);
      return { x: API.x + dx, y: API.y + dy, color: "var(--status-down)", opacity: 0.85 };
    }

    return {
      x: lerp(fromCoord.x, toCoord.x, eased),
      y: lerp(fromCoord.y, toCoord.y, eased),
      color,
      opacity,
    };
  }

  switch (req.phase) {
    case "to-limiter":
      return { x: lerp(CLIENT.x, LIMITER.x, eased), y: lerp(CLIENT.y, LIMITER.y, eased), color: transitColor, opacity: 1 };
    case "to-global":
      return { x: lerp(LIMITER.x, GLOBAL.x, eased), y: lerp(LIMITER.y, GLOBAL.y, eased), color: transitColor, opacity: 1 };
    case "to-api": {
      // Slowloris never touches either limiter — it goes straight from the
      // client to the API's raw connection handling. Everything else only
      // routes through the global node when that limiter is on the path.
      const from = req.attackKind === "slowloris" ? CLIENT : globalActive ? GLOBAL : LIMITER;
      return { x: lerp(from.x, API.x, eased), y: lerp(from.y, API.y, eased), color: transitColor, opacity: 1 };
    }
    case "held": {
      // Parked at the API, not moving — it's an open connection being held,
      // not a request in flight. Scattered around the node so the count of
      // simultaneously-held connections is visible at a glance.
      const { dx, dy } = heldOffset(req.id);
      return { x: API.x + dx, y: API.y + dy, color: "var(--status-down)", opacity: 0.85 };
    }
    case "returning": {
      // Bounces back from whichever node actually produced the outcome —
      // limiter, global checkpoint, or the API itself.
      const origin = returnOrigin(req.outcome);
      const color = OUTCOME_COLOR[req.outcome ?? "allowed"];
      return { x: lerp(origin.x, CLIENT.x, eased), y: lerp(origin.y, CLIENT.y, eased), color, opacity: 1 };
    }
    case "done":
    default: {
      const color = OUTCOME_COLOR[req.outcome ?? "allowed"];
      return { x: CLIENT.x, y: CLIENT.y, color, opacity: 1 - t };
    }
  }
}

const ALGORITHM_LABEL: Record<string, string> = {
  "fixed-window": "fixed window",
  "sliding-window": "sliding window",
  "token-bucket": "token bucket",
  "leaky-bucket": "leaky bucket",
};

export function RateLimiterDiagram({
  algorithm,
  allowed,
  limited,
  overloaded,
  requests,
  now,
  globalLimiterActive,
  throttled,
  globalTokens,
  globalCapacity,
  blockedPackets,
  slowlorisHeld,
  slowlorisCapacity,
  activeAttack,
  attackSourceCount,
}: {
  algorithm: string;
  allowed: number;
  limited: number;
  overloaded: number;
  requests: RequestPacket[];
  now: number;
  globalLimiterActive: boolean;
  throttled: number;
  globalTokens: number;
  globalCapacity: number;
  blockedPackets: BlockedPacket[];
  slowlorisHeld: number;
  slowlorisCapacity: number;
  activeAttack: AttackType | null;
  attackSourceCount: number;
}) {
  const attackAtClient = activeAttack === "http-flood" || activeAttack === "slowloris";
  const attackAtNetworkEdge = activeAttack === "syn-flood" || activeAttack === "udp-amplification";
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full"
      role="img"
      aria-label="Rate limiter request flow diagram"
    >
      {/* Legend — dot colors and the attack ring otherwise carry no stated meaning */}
      <g fontSize={8.5} className="fill-text-faint">
        {LEGEND_ITEMS.map((item) => (
          <g key={item.label}>
            <circle
              cx={item.x}
              cy={LEGEND_Y}
              r={4}
              fill={item.ring ? "none" : item.color}
              stroke={item.ring ? item.color : "none"}
              strokeWidth={item.ring ? 1.5 : 0}
            />
            <text x={item.x + 9} y={LEGEND_Y + 3}>{item.label}</text>
          </g>
        ))}
      </g>

      {/* Static topology lines */}
      <line x1={CLIENT.x} y1={CLIENT.y} x2={LIMITER.x} y2={LIMITER.y} stroke="var(--border-strong)" strokeWidth={1.5} />
      <line x1={LIMITER.x} y1={LIMITER.y} x2={GLOBAL.x} y2={GLOBAL.y} stroke="var(--border-strong)" strokeWidth={1.5} />
      <line x1={GLOBAL.x} y1={GLOBAL.y} x2={API.x} y2={API.y} stroke="var(--border-strong)" strokeWidth={1.5} />

      {/* Network edge — where SYN floods / UDP amplification die before ever becoming an HTTP request */}
      <line
        x1={NETWORK_EDGE.x}
        y1={NETWORK_EDGE.y}
        x2={CLIENT.x - 22}
        y2={CLIENT.y}
        stroke="var(--border-strong)"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <text x={NETWORK_EDGE.x} y={NETWORK_EDGE.y - 30} textAnchor="middle" className="fill-text-faint" fontSize={9}>
        network
      </text>
      {attackAtNetworkEdge && (
        <>
          <AttackSwarm cx={NETWORK_EDGE.x} cy={NETWORK_EDGE.y} radius={14} />
          <text
            x={NETWORK_EDGE.x}
            y={NETWORK_EDGE.y + 58}
            textAnchor="middle"
            className="fill-status-down font-mono"
            fontSize={9}
          >
            {attackSourceCount} src IPs
          </text>
        </>
      )}
      {blockedPackets.map((b) => {
        const age = now - b.spawnTime;
        const t = Math.min(1, Math.max(0, age / BLOCKED_LIFETIME_MS));
        const opacity = 1 - t;
        const jitter = ((b.id * 37) % 70) - 35;
        const y = NETWORK_EDGE.y + jitter;
        const size = 5;
        return (
          <g key={b.id} opacity={opacity} stroke="var(--status-down)" strokeWidth={2} strokeLinecap="round">
            <line x1={NETWORK_EDGE.x - size} y1={y - size} x2={NETWORK_EDGE.x + size} y2={y + size} />
            <line x1={NETWORK_EDGE.x - size} y1={y + size} x2={NETWORK_EDGE.x + size} y2={y - size} />
          </g>
        );
      })}

      {/* Client node — one circle stands in for many machines, so an active
          flood gets a ring of satellite dots plus a distinct-source count to
          make the spoofing visible instead of implying a single caller. */}
      {attackAtClient && <AttackSwarm cx={CLIENT.x} cy={CLIENT.y} />}
      <g>
        <circle
          cx={CLIENT.x}
          cy={CLIENT.y}
          r={22}
          fill="var(--panel-raised)"
          stroke={attackAtClient ? "var(--status-down)" : "var(--border-strong)"}
        />
        <text x={CLIENT.x} y={CLIENT.y + 40} textAnchor="middle" className="fill-text-muted" fontSize={11}>
          clients
        </text>
        {attackAtClient && (
          <text x={CLIENT.x} y={CLIENT.y + 54} textAnchor="middle" className="fill-status-down font-mono" fontSize={9}>
            {attackSourceCount} spoofed IPs
          </text>
        )}
      </g>

      {/* Limiter node */}
      <g>
        <rect
          x={LIMITER.x - 66}
          y={LIMITER.y - 34}
          width={132}
          height={68}
          rx={14}
          fill="var(--panel-raised)"
          stroke="var(--accent)"
          strokeWidth={1.5}
        />
        <text x={LIMITER.x} y={LIMITER.y - 8} textAnchor="middle" className="fill-text" fontSize={13} fontWeight={600}>
          Rate limiter
        </text>
        <text x={LIMITER.x} y={LIMITER.y + 12} textAnchor="middle" className="fill-accent font-mono" fontSize={9}>
          {ALGORITHM_LABEL[algorithm] ?? algorithm}
        </text>
        <text x={LIMITER.x} y={LIMITER.y + 26} textAnchor="middle" className="fill-status-down font-mono" fontSize={9}>
          429 × {limited}
        </text>
      </g>

      {/* Global (server-wide) limiter node — always on path, styled by active state */}
      <g className="transition-all duration-300" style={{ opacity: globalLimiterActive ? 1 : 0.4 }}>
        <rect
          x={GLOBAL.x - 60}
          y={GLOBAL.y - 34}
          width={120}
          height={68}
          rx={14}
          fill="var(--panel-raised)"
          stroke={globalLimiterActive ? "var(--status-active)" : "var(--border-strong)"}
          strokeWidth={1.5}
          strokeDasharray={globalLimiterActive ? "none" : "3 3"}
        />
        <text x={GLOBAL.x} y={GLOBAL.y - 8} textAnchor="middle" className="fill-text" fontSize={13} fontWeight={600}>
          Server limiter
        </text>
        {globalLimiterActive ? (
          <>
            <text x={GLOBAL.x} y={GLOBAL.y + 12} textAnchor="middle" className="fill-status-active font-mono" fontSize={9}>
              {globalTokens.toFixed(0)}/{globalCapacity} tokens
            </text>
            <text x={GLOBAL.x} y={GLOBAL.y + 26} textAnchor="middle" className="fill-status-active font-mono" fontSize={9}>
              429 × {throttled}
            </text>
          </>
        ) : (
          <text x={GLOBAL.x} y={GLOBAL.y + 19} textAnchor="middle" className="fill-text-faint font-mono" fontSize={9}>
            bypassed
          </text>
        )}
      </g>

      {/* API node */}
      <g>
        <rect
          x={API.x - 63}
          y={API.y - 44}
          width={126}
          height={88}
          rx={12}
          fill="var(--panel-raised)"
          stroke="var(--status-up)"
          strokeWidth={1.5}
        />
        <text x={API.x} y={API.y - 22} textAnchor="middle" className="fill-text" fontSize={13} fontWeight={600}>
          API
        </text>
        <text x={API.x} y={API.y - 2} textAnchor="middle" className="fill-status-up font-mono" fontSize={9}>
          200 × {allowed}
        </text>
        <text x={API.x} y={API.y + 12} textAnchor="middle" className="fill-status-warn font-mono" fontSize={9}>
          503 × {overloaded}
        </text>
        <text x={API.x} y={API.y + 26} textAnchor="middle" className="fill-status-down font-mono" fontSize={9}>
          held {slowlorisHeld}/{slowlorisCapacity}
        </text>
      </g>

      {/* In-flight request packets */}
      {requests.map((req) => {
        const p = packetPosition(req, now, globalLimiterActive);
        return (
          <circle
            key={req.id}
            cx={p.x}
            cy={p.y}
            r={4.5}
            fill={p.color}
            opacity={p.opacity}
            stroke={req.isDdos ? "var(--status-down)" : "none"}
            strokeWidth={req.isDdos ? 1.5 : 0}
          />
        );
      })}
    </svg>
  );
}
