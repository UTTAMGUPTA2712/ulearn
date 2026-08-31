import type { ConsumerState, DeliveryMode, Message } from "../_lib/types";

const VIEW_W = 800;
const VIEW_H = 460;
const PRODUCER = { x: 75, y: 230 };
const BROKER = { x: 310, y: 230 };
const CONSUMER_X = 580;
const CONSUMER_TOP = 80;
const CONSUMER_BOTTOM = 380;
const DLQ = { x: 740, y: 230 };

function consumerY(index: number, count: number): number {
  if (count <= 1) return (CONSUMER_TOP + CONSUMER_BOTTOM) / 2;
  return CONSUMER_TOP + (index * (CONSUMER_BOTTOM - CONSUMER_TOP)) / (count - 1);
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** A moving message is always blue in transit — outcome color only applies once it's resolved. */
const TRANSIT_COLOR = "var(--status-active)";
const OUTCOME_COLOR: Record<string, string> = {
  acked: "var(--status-up)",
  "dead-lettered": "var(--status-down)",
  dropped: "var(--status-down)",
};

/** Explains what each dot color means — without it the animation is just colored motion. */
const LEGEND_ITEMS: { x: number; color: string; label: string }[] = [
  { x: 20, color: TRANSIT_COLOR, label: "in transit" },
  { x: 150, color: "var(--status-warn)", label: "retrying" },
  { x: 280, color: "var(--status-up)", label: "acked" },
  { x: 420, color: "var(--status-down)", label: "dead-lettered / dropped" },
];

/** Small chevron at the midpoint of a static line, so the topology reads as a flow instead of just connected boxes. */
function FlowArrow({ from, to, opacity = 0.6 }: { from: { x: number; y: number }; to: { x: number; y: number }; opacity?: number }) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  return (
    <polygon
      points="-5,-4 5,0 -5,4"
      fill="var(--border-strong)"
      opacity={opacity}
      transform={`translate(${mx}, ${my}) rotate(${angle})`}
    />
  );
}

export function MessageQueueDiagram({
  mode,
  now,
  capacity,
  queueLength,
  consumers,
  messages,
  dlqCount,
  producerBlocked,
  autoPublish,
}: {
  mode: DeliveryMode;
  now: number;
  capacity: number;
  queueLength: number;
  consumers: ConsumerState[];
  messages: Message[];
  dlqCount: number;
  producerBlocked: boolean;
  autoPublish: boolean;
}) {
  const consumerCoord = (id: number | null) => {
    if (id === null) return BROKER;
    const index = consumers.findIndex((c) => c.id === id);
    if (index === -1) return BROKER;
    return { x: CONSUMER_X, y: consumerY(index, consumers.length) };
  };

  const cols = 4;
  const rows = Math.ceil(capacity / cols);
  const brokerBoxHeight = mode === "queue" ? Math.max(160, rows * 44 + 70) : 150;
  const brokerBoxTop = BROKER.y - brokerBoxHeight / 2;

  const backlog =
    mode === "queue"
      ? [...messages]
          .filter((m) => m.phase === "queued" && m.queueOwner === null)
          .sort((a, b) => a.id - b.id)
      : [];

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full"
      role="img"
      aria-label="Message queue flow diagram"
    >
      {/* Static topology */}
      <line x1={PRODUCER.x} y1={PRODUCER.y} x2={BROKER.x} y2={BROKER.y} stroke="var(--border-strong)" strokeWidth={1.5} />
      <FlowArrow from={PRODUCER} to={BROKER} />
      {consumers.map((c, i) => {
        const to = { x: CONSUMER_X, y: consumerY(i, consumers.length) };
        return (
          <g key={`line-${c.id}`}>
            <line x1={BROKER.x} y1={BROKER.y} x2={to.x} y2={to.y} stroke="var(--border-strong)" strokeWidth={1.5} />
            <FlowArrow from={BROKER} to={to} />
          </g>
        );
      })}
      {consumers.map((c, i) => (
        <line
          key={`dlq-line-${c.id}`}
          x1={CONSUMER_X}
          y1={consumerY(i, consumers.length)}
          x2={DLQ.x}
          y2={DLQ.y}
          stroke="var(--border)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      ))}

      {/* Legend — the moving dots are otherwise just colored motion with no stated meaning */}
      <g>
        {LEGEND_ITEMS.map((item) => (
          <g key={item.label} transform={`translate(${item.x}, 16)`}>
            <circle cx={0} cy={0} r={4} fill={item.color} />
            <text x={9} y={3} className="fill-text-faint" fontSize={9}>
              {item.label}
            </text>
          </g>
        ))}
      </g>

      {/* Producer node */}
      <g>
        <circle
          cx={PRODUCER.x}
          cy={PRODUCER.y}
          r={24}
          fill="var(--panel-raised)"
          stroke={producerBlocked ? "var(--status-down)" : "var(--border-strong)"}
          strokeWidth={producerBlocked ? 2 : 1.5}
        />
        <text x={PRODUCER.x} y={PRODUCER.y + 4} textAnchor="middle" className="fill-text-muted" fontSize={10}>
          {mode === "queue" ? "producer" : "publisher"}
        </text>
        <text x={PRODUCER.x} y={PRODUCER.y + 44} textAnchor="middle" className="fill-text-faint" fontSize={10}>
          {producerBlocked ? "paused" : autoPublish ? "streaming" : "idle"}
        </text>
      </g>

      {/* Broker node */}
      <g>
        <rect
          x={BROKER.x - 70}
          y={brokerBoxTop}
          width={140}
          height={brokerBoxHeight}
          rx={14}
          fill="var(--panel-raised)"
          stroke="var(--accent)"
          strokeWidth={1.5}
        />
        <text x={BROKER.x} y={brokerBoxTop + 22} textAnchor="middle" className="fill-text" fontSize={13} fontWeight={600}>
          {mode === "queue" ? "Queue" : "Topic"}
        </text>
        <text x={BROKER.x} y={brokerBoxTop + 38} textAnchor="middle" className="fill-accent font-mono" fontSize={9}>
          {mode === "queue" ? `${queueLength}/${capacity} waiting` : "fans out to every consumer"}
        </text>

        {mode === "queue" ? (
          <g>
            {Array.from({ length: capacity }, (_, i) => {
              const col = i % cols;
              const row = Math.floor(i / cols);
              const gap = 6;
              const innerW = 140 - 24;
              const innerH = brokerBoxHeight - 56;
              const slotW = (innerW - gap * (cols - 1)) / cols;
              const slotH = Math.min(28, (innerH - gap * (rows - 1)) / rows);
              const x = BROKER.x - innerW / 2 + col * (slotW + gap);
              const y = brokerBoxTop + 50 + row * (slotH + gap);
              const msg = backlog[i];
              const retried = msg && msg.attempts > 0;
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={slotW}
                  height={slotH}
                  rx={3}
                  fill={msg ? (retried ? "var(--status-warn)" : "var(--accent-dim)") : "transparent"}
                  stroke={msg ? "none" : "var(--border)"}
                  opacity={msg ? 0.85 : 0.6}
                />
              );
            })}
          </g>
        ) : (
          <polygon
            points={`${BROKER.x},${brokerBoxTop + 60} ${BROKER.x + 34},${brokerBoxTop + 95} ${BROKER.x},${brokerBoxTop + 130} ${BROKER.x - 34},${brokerBoxTop + 95}`}
            fill="var(--accent-dim)"
            stroke="var(--accent)"
            strokeWidth={1.5}
          />
        )}
      </g>

      {/* Consumer nodes */}
      {consumers.map((c, i) => {
        const y = consumerY(i, consumers.length);
        const processingMsg = messages.find((m) => m.consumerId === c.id && m.phase === "processing");
        const progress = processingMsg
          ? Math.min(1, Math.max(0, (now - processingMsg.phaseStart) / processingMsg.phaseDuration))
          : 0;
        const stuckMsg = messages.find((m) => m.consumerId === c.id && m.phase === "stuck");
        const borderColor =
          c.status === "crashed" ? "var(--status-down)" : c.status === "processing" ? "var(--status-active)" : "var(--border-strong)";

        return (
          <g key={c.id}>
            <rect
              x={CONSUMER_X - 60}
              y={y - 36}
              width={120}
              height={72}
              rx={12}
              fill="var(--panel-raised)"
              stroke={borderColor}
              strokeWidth={1.5}
              strokeDasharray={c.status === "crashed" ? "4 3" : "none"}
            />
            <text x={CONSUMER_X} y={y - 16} textAnchor="middle" className="fill-text" fontSize={12} fontWeight={600}>
              C{c.id}
            </text>
            <text
              x={CONSUMER_X}
              y={y}
              textAnchor="middle"
              fontSize={9}
              className={
                c.status === "crashed" ? "fill-status-down font-mono" : c.status === "processing" ? "fill-status-active font-mono" : "fill-text-faint font-mono"
              }
            >
              {c.status === "crashed" ? (stuckMsg ? "crashed — msg stuck" : "crashed") : c.status === "processing" ? "processing…" : "idle"}
            </text>
            {c.status === "processing" && (
              <g>
                <rect x={CONSUMER_X - 44} y={y + 8} width={88} height={4} rx={2} fill="var(--border)" />
                <rect x={CONSUMER_X - 44} y={y + 8} width={88 * progress} height={4} rx={2} fill="var(--status-active)" />
              </g>
            )}
            <text x={CONSUMER_X} y={y + 26} textAnchor="middle" className="fill-text-faint font-mono" fontSize={9}>
              {c.processed} ok · {c.failed} failed
            </text>
            {mode === "fanout" && (
              <g>
                <text x={CONSUMER_X} y={y - 46} textAnchor="middle" className="fill-text-faint font-mono" fontSize={9}>
                  backlog {c.queueLength}/{capacity}
                </text>
                <rect x={CONSUMER_X - 44} y={y - 41} width={88} height={4} rx={2} fill="var(--border)" />
                <rect
                  x={CONSUMER_X - 44}
                  y={y - 41}
                  width={88 * Math.min(1, c.queueLength / capacity)}
                  height={4}
                  rx={2}
                  fill="var(--accent)"
                />
              </g>
            )}
          </g>
        );
      })}

      {/* Dead-letter queue node */}
      <g>
        <rect
          x={DLQ.x - 48}
          y={DLQ.y - 44}
          width={96}
          height={88}
          rx={12}
          fill="var(--panel-raised)"
          stroke="var(--status-down)"
          strokeWidth={1.5}
          strokeDasharray={dlqCount === 0 ? "3 3" : "none"}
        />
        <text x={DLQ.x} y={DLQ.y - 20} textAnchor="middle" className="fill-text" fontSize={11} fontWeight={600}>
          Dead-letter
        </text>
        <text x={DLQ.x} y={DLQ.y - 6} textAnchor="middle" className="fill-text" fontSize={11} fontWeight={600}>
          queue
        </text>
        <text x={DLQ.x} y={DLQ.y + 16} textAnchor="middle" className="fill-status-down font-mono" fontSize={13} fontWeight={600}>
          {dlqCount}
        </text>
      </g>

      {/* In-flight message packets — only rendered while actually moving or fading */}
      {messages.map((m) => {
        const t = Math.min(1, Math.max(0, (now - m.phaseStart) / m.phaseDuration));
        const eased = easeOutCubic(t);

        if (m.phase === "queued" || m.phase === "processing" || m.phase === "stuck" || m.phase === "done") return null;

        if (m.phase === "dropped") {
          const at = m.queueOwner !== null ? consumerCoord(m.queueOwner) : BROKER;
          const opacity = 1 - t;
          const size = 5;
          return (
            <g key={m.id} opacity={opacity} stroke="var(--status-down)" strokeWidth={2} strokeLinecap="round">
              <line x1={at.x - size} y1={at.y - 60 - size} x2={at.x + size} y2={at.y - 60 + size} />
              <line x1={at.x - size} y1={at.y - 60 + size} x2={at.x + size} y2={at.y - 60 - size} />
            </g>
          );
        }

        if (m.phase === "acked") {
          const at = consumerCoord(m.consumerId);
          return (
            <circle key={m.id} cx={at.x} cy={at.y - 46} r={4.5} fill={OUTCOME_COLOR.acked} opacity={1 - t}>
              <title>{`Message #${m.id} · acked`}</title>
            </circle>
          );
        }

        let from = PRODUCER;
        let to = BROKER;
        if (m.phase === "to-broker") {
          from = PRODUCER;
          to = BROKER;
        } else if (m.phase === "to-consumer") {
          from = BROKER;
          to = consumerCoord(m.consumerId);
        } else if (m.phase === "to-requeue") {
          from = consumerCoord(m.consumerId);
          to = BROKER;
        } else if (m.phase === "to-dlq") {
          from = consumerCoord(m.consumerId);
          to = DLQ;
        }

        const color = m.phase === "to-requeue" ? "var(--status-warn)" : m.phase === "to-dlq" ? "var(--status-down)" : TRANSIT_COLOR;
        // A message being redelivered after a failure/crash gets a ring so
        // the retry is traceable in flight, not just inferable from the
        // amber backlog slot it lands in.
        const isRedelivery = m.attempts > 0 && m.phase === "to-consumer";

        return (
          <circle
            key={m.id}
            cx={lerp(from.x, to.x, eased)}
            cy={lerp(from.y, to.y, eased)}
            r={4.5}
            fill={color}
            opacity={1}
            stroke={isRedelivery ? "var(--status-warn)" : "none"}
            strokeWidth={isRedelivery ? 2 : 0}
          >
            <title>{`Message #${m.id}${m.attempts > 0 ? ` · attempt ${m.attempts + 1}` : ""}`}</title>
          </circle>
        );
      })}
    </svg>
  );
}
