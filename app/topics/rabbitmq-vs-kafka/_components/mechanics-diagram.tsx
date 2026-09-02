import type { KafkaGroup, MechanicsSnapshot } from "../_lib/mechanics-types";

const VIEW_W = 820;
const VIEW_H = 380;
const MID = 405;

const PRODUCER_L = { x: 50, y: 190 };
const QUEUE_BOX = { x: 110, y: 140, w: 130, h: 100 };
const CONSUMER_X = 350;
const CONSUMER_TOP = 60;
const CONSUMER_BOTTOM = 320;

const PRODUCER_R = { x: 475, y: 190 };
const LOG_BOX = { x: 555, y: 172, w: 230, h: 36 };

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function consumerY(index: number, count: number): number {
  if (count <= 1) return (CONSUMER_TOP + CONSUMER_BOTTOM) / 2;
  return CONSUMER_TOP + (index * (CONSUMER_BOTTOM - CONSUMER_TOP)) / (count - 1);
}

/** Dash pattern differentiates consumer groups without inventing new hues — group 0 is solid accent, the rest step through dash patterns. */
const GROUP_DASH = ["none", "5 3", "2 3"];

function groupSlotIndex(group: KafkaGroup, log: MechanicsSnapshot["kafkaLog"]): number {
  const idx = log.findIndex((e) => e.id === group.nextOffset);
  if (idx !== -1) return idx;
  // Caught up to the live edge (nothing new yet) — park just past the last slot.
  return log.length;
}

export function MechanicsDiagram({ snapshot }: { snapshot: MechanicsSnapshot }) {
  const { now, rabbitConsumers, rabbitMessages, kafkaLog, kafkaCapacity, kafkaGroups, kafkaExpiryFlashes } = snapshot;

  const queued = rabbitMessages.filter((m) => m.phase === "queued").sort((a, b) => a.id - b.id);

  const slotW = LOG_BOX.w / kafkaCapacity;

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-full w-full" role="img" aria-label="RabbitMQ push-and-delete vs Kafka pull-and-retain mechanics">
      <line x1={MID} y1={16} x2={MID} y2={VIEW_H - 12} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 4" />

      {/* ---------- RabbitMQ ---------- */}
      <text x={200} y={24} textAnchor="middle" className="fill-accent" fontSize={12} fontWeight={600}>
        RabbitMQ — push, delete on ack
      </text>

      <circle cx={PRODUCER_L.x} cy={PRODUCER_L.y} r={18} fill="var(--panel-raised)" stroke="var(--border-strong)" strokeWidth={1.5} />
      <text x={PRODUCER_L.x} y={PRODUCER_L.y + 34} textAnchor="middle" className="fill-text-muted" fontSize={9}>
        producer
      </text>
      <line x1={PRODUCER_L.x + 18} y1={PRODUCER_L.y} x2={QUEUE_BOX.x} y2={PRODUCER_L.y} stroke="var(--border-strong)" strokeWidth={1.5} />

      <rect x={QUEUE_BOX.x} y={QUEUE_BOX.y} width={QUEUE_BOX.w} height={QUEUE_BOX.h} rx={12} fill="var(--panel-raised)" stroke="var(--border-strong)" strokeWidth={1.5} />
      <text x={QUEUE_BOX.x + QUEUE_BOX.w / 2} y={QUEUE_BOX.y - 8} textAnchor="middle" className="fill-text-faint font-mono" fontSize={9}>
        queue · {queued.length} waiting
      </text>
      {queued.slice(0, 8).map((m, i) => (
        <circle
          key={m.id}
          cx={QUEUE_BOX.x + QUEUE_BOX.w - 16 - i * 15}
          cy={QUEUE_BOX.y + QUEUE_BOX.h / 2}
          r={5}
          fill="var(--status-active)"
        />
      ))}

      <line x1={QUEUE_BOX.x + QUEUE_BOX.w} y1={PRODUCER_L.y} x2={CONSUMER_X - 20} y2={PRODUCER_L.y} stroke="var(--border-strong)" strokeWidth={1} strokeDasharray="2 3" opacity={0.4} />

      {rabbitConsumers.map((c, i) => {
        const y = consumerY(i, rabbitConsumers.length);
        const msg = rabbitMessages.find((m) => m.consumerId === c.id);
        const progress =
          msg && msg.phase === "processing" ? Math.min(1, Math.max(0, (now - msg.phaseStart) / msg.phaseDuration)) : 0;

        return (
          <g key={c.id}>
            <line x1={QUEUE_BOX.x + QUEUE_BOX.w} y1={QUEUE_BOX.y + QUEUE_BOX.h / 2} x2={CONSUMER_X - 34} y2={y} stroke="var(--border)" strokeWidth={1} />
            <rect
              x={CONSUMER_X - 34}
              y={y - 26}
              width={68}
              height={52}
              rx={10}
              fill="var(--panel-raised)"
              stroke={c.status === "processing" ? "var(--status-active)" : "var(--border-strong)"}
              strokeWidth={1.5}
            />
            <text x={CONSUMER_X} y={y - 8} textAnchor="middle" className="fill-text" fontSize={10} fontWeight={600}>
              W{c.id}
            </text>
            {c.status === "processing" ? (
              <g>
                <rect x={CONSUMER_X - 24} y={y + 2} width={48} height={4} rx={2} fill="var(--border)" />
                <rect x={CONSUMER_X - 24} y={y + 2} width={48 * progress} height={4} rx={2} fill="var(--status-active)" />
              </g>
            ) : (
              <text x={CONSUMER_X} y={y + 8} textAnchor="middle" className="fill-text-faint" fontSize={8}>
                idle
              </text>
            )}
          </g>
        );
      })}

      {/* Messages traveling queue → consumer, and the "vanish" moment on ack */}
      {rabbitMessages.map((m) => {
        if (m.phase !== "to-consumer" && m.phase !== "acked") return null;
        const t = Math.min(1, Math.max(0, (now - m.phaseStart) / m.phaseDuration));
        const consumerIndex = rabbitConsumers.findIndex((c) => c.id === m.consumerId);
        const target = { x: CONSUMER_X, y: consumerY(Math.max(consumerIndex, 0), rabbitConsumers.length) - 26 };

        if (m.phase === "acked") {
          return <circle key={m.id} cx={target.x} cy={target.y} r={5} fill="var(--status-up)" opacity={1 - t} />;
        }
        const from = { x: QUEUE_BOX.x + QUEUE_BOX.w, y: QUEUE_BOX.y + QUEUE_BOX.h / 2 };
        const eased = easeOutCubic(t);
        return <circle key={m.id} cx={lerp(from.x, target.x, eased)} cy={lerp(from.y, target.y, eased)} r={5} fill="var(--status-active)" />;
      })}

      {/* ---------- Kafka ---------- */}
      <text x={615} y={24} textAnchor="middle" className="fill-accent" fontSize={12} fontWeight={600}>
        Kafka — pull, retain until eviction
      </text>

      <circle cx={PRODUCER_R.x} cy={PRODUCER_R.y} r={18} fill="var(--panel-raised)" stroke="var(--border-strong)" strokeWidth={1.5} />
      <text x={PRODUCER_R.x} y={PRODUCER_R.y + 34} textAnchor="middle" className="fill-text-muted" fontSize={9}>
        producer
      </text>
      <line x1={PRODUCER_R.x + 18} y1={PRODUCER_R.y} x2={LOG_BOX.x} y2={PRODUCER_R.y} stroke="var(--border-strong)" strokeWidth={1.5} />

      <rect x={LOG_BOX.x} y={LOG_BOX.y} width={LOG_BOX.w} height={LOG_BOX.h} rx={8} fill="var(--panel-raised)" stroke="var(--accent)" strokeWidth={1.5} />
      <text x={LOG_BOX.x + LOG_BOX.w / 2} y={LOG_BOX.y - 10} textAnchor="middle" className="fill-text-faint font-mono" fontSize={9}>
        log · retains last {kafkaCapacity}
      </text>
      {kafkaLog.map((entry, i) => (
        <rect
          key={entry.id}
          x={LOG_BOX.x + i * slotW + 2}
          y={LOG_BOX.y + 4}
          width={slotW - 4}
          height={LOG_BOX.h - 8}
          rx={3}
          fill="var(--accent-dim)"
          stroke="var(--accent)"
          strokeWidth={i === kafkaLog.length - 1 ? 1.5 : 0}
        />
      ))}
      {/* Expiry flash — the entry itself is already gone; this just marks where it fell off */}
      {kafkaExpiryFlashes.map((f) => {
        const age = now - f.spawnedAt;
        const opacity = 1 - age / 420;
        const x = LOG_BOX.x - 8;
        const y = LOG_BOX.y + LOG_BOX.h / 2;
        return (
          <g key={f.id} opacity={Math.max(0, opacity)} stroke="var(--status-down)" strokeWidth={2} strokeLinecap="round">
            <line x1={x - 5} y1={y - 5} x2={x + 5} y2={y + 5} />
            <line x1={x - 5} y1={y + 5} x2={x + 5} y2={y - 5} />
          </g>
        );
      })}

      {/* Consumer group offset cursors */}
      {kafkaGroups.map((g, gi) => {
        const slotIndex = groupSlotIndex(g, kafkaLog);
        const x = LOG_BOX.x + slotIndex * slotW;
        const labelY = LOG_BOX.y + LOG_BOX.h + 24 + gi * 30;
        const justRead = g.lastReadAt !== null && now - g.lastReadAt < 250;
        const fellBehind = g.fellBehindAt !== null && now - g.fellBehindAt < 900;

        return (
          <g key={g.id}>
            <line
              x1={x}
              y1={LOG_BOX.y - 4}
              x2={x}
              y2={LOG_BOX.y + LOG_BOX.h + 4}
              stroke={gi === 0 ? "var(--accent)" : "var(--text-faint)"}
              strokeWidth={justRead ? 2.5 : 1.5}
              strokeDasharray={GROUP_DASH[gi % GROUP_DASH.length]}
            />
            {justRead && <circle cx={x} cy={LOG_BOX.y + LOG_BOX.h / 2} r={9} fill="none" stroke="var(--status-up)" strokeWidth={1.5} opacity={0.8} />}
            <line x1={x} y1={LOG_BOX.y + LOG_BOX.h + 4} x2={LOG_BOX.x + 6} y2={labelY - 5} stroke="var(--border)" strokeWidth={1} opacity={0.5} />
            <text x={LOG_BOX.x + 6} y={labelY} className="fill-text-muted font-mono" fontSize={9}>
              {g.label} · offset {g.nextOffset}
            </text>
            {fellBehind && (
              <text x={LOG_BOX.x + 6} y={labelY + 12} className="fill-status-down font-mono" fontSize={8}>
                fell behind retention — skipped ahead
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
