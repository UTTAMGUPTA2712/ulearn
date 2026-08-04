import type { RequestPacket } from "../_lib/types";

const VIEW_W = 720;
const VIEW_H = 420;
const CLIENT = { x: 60, y: VIEW_H / 2 };
const LIMITER = { x: 330, y: VIEW_H / 2 };
const GLOBAL = { x: 505, y: VIEW_H / 2 };
const API = { x: 655, y: VIEW_H / 2 };

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

function packetPosition(
  req: RequestPacket,
  now: number,
  globalActive: boolean,
): { x: number; y: number; color: string; opacity: number } {
  const t = Math.min(1, Math.max(0, (now - req.phaseStart) / req.phaseDuration));
  const eased = easeOutCubic(t);

  switch (req.phase) {
    case "to-limiter":
      return { x: lerp(CLIENT.x, LIMITER.x, eased), y: lerp(CLIENT.y, LIMITER.y, eased), color: "var(--status-active)", opacity: 1 };
    case "to-global":
      return { x: lerp(LIMITER.x, GLOBAL.x, eased), y: lerp(LIMITER.y, GLOBAL.y, eased), color: "var(--status-active)", opacity: 1 };
    case "to-api": {
      // Only routes through the global node when that limiter is on the path.
      const from = globalActive ? GLOBAL : LIMITER;
      return { x: lerp(from.x, API.x, eased), y: lerp(from.y, API.y, eased), color: "var(--status-active)", opacity: 1 };
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
}) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full"
      role="img"
      aria-label="Rate limiter request flow diagram"
    >
      {/* Static topology lines */}
      <line x1={CLIENT.x} y1={CLIENT.y} x2={LIMITER.x} y2={LIMITER.y} stroke="var(--border-strong)" strokeWidth={1.5} />
      {globalLimiterActive ? (
        <>
          <line x1={LIMITER.x} y1={LIMITER.y} x2={GLOBAL.x} y2={GLOBAL.y} stroke="var(--border-strong)" strokeWidth={1.5} />
          <line x1={GLOBAL.x} y1={GLOBAL.y} x2={API.x} y2={API.y} stroke="var(--border-strong)" strokeWidth={1.5} />
        </>
      ) : (
        <line x1={LIMITER.x} y1={LIMITER.y} x2={API.x} y2={API.y} stroke="var(--border-strong)" strokeWidth={1.5} />
      )}

      {/* Client node */}
      <g>
        <circle cx={CLIENT.x} cy={CLIENT.y} r={22} fill="var(--panel-raised)" stroke="var(--border-strong)" />
        <text x={CLIENT.x} y={CLIENT.y + 40} textAnchor="middle" className="fill-text-muted" fontSize={11}>
          clients
        </text>
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

      {/* Global (server-wide) limiter node — only on the path when enabled */}
      {globalLimiterActive && (
        <g>
          <rect
            x={GLOBAL.x - 60}
            y={GLOBAL.y - 34}
            width={120}
            height={68}
            rx={14}
            fill="var(--panel-raised)"
            stroke="var(--status-active)"
            strokeWidth={1.5}
          />
          <text x={GLOBAL.x} y={GLOBAL.y - 8} textAnchor="middle" className="fill-text" fontSize={13} fontWeight={600}>
            Server limiter
          </text>
          <text x={GLOBAL.x} y={GLOBAL.y + 12} textAnchor="middle" className="fill-status-active font-mono" fontSize={9}>
            {globalTokens.toFixed(0)}/{globalCapacity} tokens
          </text>
          <text x={GLOBAL.x} y={GLOBAL.y + 26} textAnchor="middle" className="fill-status-active font-mono" fontSize={9}>
            429 × {throttled}
          </text>
        </g>
      )}

      {/* API node */}
      <g>
        <rect
          x={API.x - 63}
          y={API.y - 37}
          width={126}
          height={74}
          rx={12}
          fill="var(--panel-raised)"
          stroke="var(--status-up)"
          strokeWidth={1.5}
        />
        <text x={API.x} y={API.y - 15} textAnchor="middle" className="fill-text" fontSize={13} fontWeight={600}>
          API
        </text>
        <text x={API.x} y={API.y + 5} textAnchor="middle" className="fill-status-up font-mono" fontSize={9}>
          200 × {allowed}
        </text>
        <text x={API.x} y={API.y + 19} textAnchor="middle" className="fill-status-warn font-mono" fontSize={9}>
          503 × {overloaded}
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
