import type { RequestPacket } from "../_lib/types";

const VIEW_W = 720;
const VIEW_H = 420;
const CLIENT = { x: 60, y: VIEW_H / 2 };
const LIMITER = { x: 360, y: VIEW_H / 2 };
const API = { x: 650, y: VIEW_H / 2 };

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function packetPosition(req: RequestPacket, now: number): { x: number; y: number; color: string; opacity: number } {
  const t = Math.min(1, Math.max(0, (now - req.phaseStart) / req.phaseDuration));
  const eased = easeOutCubic(t);

  switch (req.phase) {
    case "to-limiter":
      return { x: lerp(CLIENT.x, LIMITER.x, eased), y: lerp(CLIENT.y, LIMITER.y, eased), color: "var(--status-active)", opacity: 1 };
    case "to-api":
      return { x: lerp(LIMITER.x, API.x, eased), y: lerp(LIMITER.y, API.y, eased), color: "var(--status-active)", opacity: 1 };
    case "returning": {
      const origin = req.outcome === "limited" ? LIMITER : API;
      const color = req.outcome === "limited" ? "var(--status-down)" : "var(--status-up)";
      return { x: lerp(origin.x, CLIENT.x, eased), y: lerp(origin.y, CLIENT.y, eased), color, opacity: 1 };
    }
    case "done":
    default: {
      const color = req.outcome === "limited" ? "var(--status-down)" : "var(--status-up)";
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
  requests,
  now,
}: {
  algorithm: string;
  allowed: number;
  limited: number;
  requests: RequestPacket[];
  now: number;
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
      <line x1={LIMITER.x} y1={LIMITER.y} x2={API.x} y2={API.y} stroke="var(--border-strong)" strokeWidth={1.5} />

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

      {/* API node */}
      <g>
        <rect
          x={API.x - 56}
          y={API.y - 30}
          width={112}
          height={60}
          rx={12}
          fill="var(--panel-raised)"
          stroke="var(--status-up)"
          strokeWidth={1.5}
        />
        <text x={API.x} y={API.y - 4} textAnchor="middle" className="fill-text" fontSize={13} fontWeight={600}>
          API
        </text>
        <text x={API.x} y={API.y + 16} textAnchor="middle" className="fill-status-up font-mono" fontSize={9}>
          200 × {allowed}
        </text>
      </g>

      {/* In-flight request packets */}
      {requests.map((req) => {
        const p = packetPosition(req, now);
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
