import type { Backend, RequestPacket } from "../_lib/types";

const VIEW_W = 720;
const VIEW_H = 420;
const CLIENT = { x: 60, y: VIEW_H / 2 };
const LB = { x: 340, y: VIEW_H / 2 };
const BACKEND_X = 640;

function backendPos(index: number, count: number) {
  if (count === 1) return { x: BACKEND_X, y: VIEW_H / 2 };
  const top = 55;
  const bottom = VIEW_H - 55;
  return { x: BACKEND_X, y: top + (index * (bottom - top)) / (count - 1) };
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const OUTCOME_COLOR: Record<string, string> = {
  success: "var(--status-up)",
  error: "var(--status-down)",
  timeout: "var(--status-warn)",
  rejected: "var(--status-down)",
};

function packetPosition(
  req: RequestPacket,
  now: number,
  backends: Backend[],
): { x: number; y: number; color: string; opacity: number } {
  const backendIndex = backends.findIndex((b) => b.id === req.backendId);
  const backendPoint = backendIndex >= 0 ? backendPos(backendIndex, backends.length) : LB;
  const t = Math.min(1, Math.max(0, (now - req.phaseStart) / req.phaseDuration));
  const eased = easeOutCubic(t);

  switch (req.phase) {
    case "to-lb":
      return {
        x: lerp(CLIENT.x, LB.x, eased),
        y: lerp(CLIENT.y, LB.y, eased),
        color: "var(--status-active)",
        opacity: 1,
      };
    case "to-backend":
      return {
        x: lerp(LB.x, backendPoint.x, eased),
        y: lerp(LB.y, backendPoint.y, eased),
        color: "var(--status-active)",
        opacity: 1,
      };
    case "stalled":
      return { x: backendPoint.x, y: backendPoint.y, color: "var(--status-warn)", opacity: 1 };
    case "returning": {
      const origin = req.backendId ? backendPoint : LB;
      return {
        x: lerp(origin.x, CLIENT.x, eased),
        y: lerp(origin.y, CLIENT.y, eased),
        color: OUTCOME_COLOR[req.outcome ?? "success"],
        opacity: 1,
      };
    }
    case "done":
    default:
      return {
        x: CLIENT.x,
        y: CLIENT.y,
        color: OUTCOME_COLOR[req.outcome ?? "success"],
        opacity: 1 - t,
      };
  }
}

export function LoadBalancerDiagram({
  algorithm,
  backends,
  requests,
  now,
}: {
  algorithm: string;
  backends: Backend[];
  requests: RequestPacket[];
  now: number;
}) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full"
      role="img"
      aria-label="Load balancer request flow diagram"
    >
      {/* Static topology lines */}
      <line x1={CLIENT.x} y1={CLIENT.y} x2={LB.x} y2={LB.y} stroke="var(--border-strong)" strokeWidth={1.5} />
      {backends.map((_, i) => {
        const pos = backendPos(i, backends.length);
        return (
          <line
            key={`line-${i}`}
            x1={LB.x}
            y1={LB.y}
            x2={pos.x}
            y2={pos.y}
            stroke="var(--border-strong)"
            strokeWidth={1.5}
          />
        );
      })}

      {/* Client node */}
      <g>
        <circle cx={CLIENT.x} cy={CLIENT.y} r={22} fill="var(--panel-raised)" stroke="var(--border-strong)" />
        <text
          x={CLIENT.x}
          y={CLIENT.y + 40}
          textAnchor="middle"
          className="fill-text-muted font-mono"
          fontSize={11}
        >
          clients
        </text>
      </g>

      {/* Load balancer node */}
      <g>
        <rect
          x={LB.x - 48}
          y={LB.y - 32}
          width={96}
          height={64}
          rx={10}
          fill="var(--panel-raised)"
          stroke="var(--accent)"
          strokeWidth={1.5}
        />
        <text x={LB.x} y={LB.y - 4} textAnchor="middle" className="fill-text font-mono" fontSize={13} fontWeight={600}>
          LB
        </text>
        <text x={LB.x} y={LB.y + 16} textAnchor="middle" className="fill-accent font-mono" fontSize={9}>
          {algorithm}
        </text>
      </g>

      {/* Backend nodes */}
      {backends.map((backend, i) => {
        const pos = backendPos(i, backends.length);
        const utilization = Math.min(1, backend.activeConnections / 6);
        const statusColor = !backend.healthy
          ? "var(--status-down)"
          : backend.fault !== "none"
            ? "var(--status-warn)"
            : "var(--status-up)";

        return (
          <g key={backend.id} opacity={backend.healthy ? 1 : 0.45}>
            <rect
              x={pos.x - 78}
              y={pos.y - 30}
              width={156}
              height={60}
              rx={8}
              fill="var(--panel-raised)"
              stroke={statusColor}
              strokeWidth={1.5}
            />
            <circle cx={pos.x - 66} cy={pos.y - 18} r={4} fill={statusColor} />
            <text x={pos.x - 56} y={pos.y - 14} className="fill-text font-mono" fontSize={12} fontWeight={600}>
              {backend.label}
            </text>
            <text x={pos.x - 66} y={pos.y + 4} className="fill-text-muted font-mono" fontSize={10}>
              {backend.healthy
                ? backend.fault === "none"
                  ? "healthy"
                  : backend.fault
                : backend.autoMarkedDown
                  ? "auto-down"
                  : "down"}
            </text>
            <text x={pos.x + 66} y={pos.y + 4} textAnchor="end" className="fill-text-faint font-mono" fontSize={10}>
              conn {backend.activeConnections}
            </text>
            {/* Utilization bar */}
            <rect x={pos.x - 66} y={pos.y + 14} width={132} height={4} rx={2} fill="var(--border)" />
            <rect
              x={pos.x - 66}
              y={pos.y + 14}
              width={132 * utilization}
              height={4}
              rx={2}
              fill={utilization > 0.8 ? "var(--status-down)" : "var(--status-active)"}
            />
          </g>
        );
      })}

      {/* In-flight request packets */}
      {requests.map((req) => {
        const p = packetPosition(req, now, backends);
        return (
          <circle
            key={req.id}
            cx={p.x}
            cy={p.y}
            r={req.phase === "stalled" ? 6 : 4.5}
            fill={p.color}
            opacity={p.opacity}
            stroke={req.isDdos ? "var(--status-down)" : "none"}
            strokeWidth={req.isDdos ? 1.5 : 0}
            className={req.phase === "stalled" ? "animate-pulse" : undefined}
          />
        );
      })}
    </svg>
  );
}
