import type { Broker } from "../_lib/types";

const VIEW_W = 820;
const VIEW_H = 340;
const MID = 410;

/**
 * Side-by-side architecture diagram — RabbitMQ's smart-broker model (producer
 * → exchange → bound queues → consumers) against Kafka's dumb-log model
 * (producer → partitioned, replicated topic → independent consumer groups at
 * their own offsets). It reacts to two of the matcher's six traits directly
 * — routing complexity (how many bound queues) and consumer pattern (one
 * consumer group or several independent ones) — because those are the two
 * traits that actually change each architecture's *shape*, not just its
 * score. The other four traits (replay, throughput, ordering, retention)
 * are better explained in the result panel's reasoning than crammed into
 * more diagram geometry.
 */
export function ComparisonDiagram({
  leader,
  routingComplex,
  fanout,
}: {
  leader: Broker | "either";
  routingComplex: boolean;
  fanout: boolean;
}) {
  const rabbitOpacity = leader === "kafka" ? 0.45 : 1;
  const kafkaOpacity = leader === "rabbitmq" ? 0.45 : 1;

  const queueCount = routingComplex ? 3 : 1;
  const queueYs = queueCount === 1 ? [170] : [90, 170, 250];
  const routingKeys = ["orders.*", "payments.*", "shipping.*"];

  const partitionYs = [70, 130, 190, 250];
  const laneX0 = 570;
  const laneX1 = 760;
  const segCount = 5;

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-full w-full" role="img" aria-label="RabbitMQ vs Kafka architecture comparison">
      <line x1={MID} y1={16} x2={MID} y2={VIEW_H - 12} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 4" />

      {/* RabbitMQ side */}
      <g className="transition-opacity duration-300" style={{ opacity: rabbitOpacity }}>
        <text x={200} y={24} textAnchor="middle" className={leader === "rabbitmq" ? "fill-accent" : "fill-text-faint"} fontSize={12} fontWeight={600}>
          RabbitMQ — smart broker
        </text>

        {/* Producer */}
        <circle cx={50} cy={170} r={20} fill="var(--panel-raised)" stroke="var(--border-strong)" strokeWidth={1.5} />
        <text x={50} y={174} textAnchor="middle" className="fill-text-muted" fontSize={9}>
          producer
        </text>

        {/* Exchange */}
        <polygon
          points="150,148 174,170 150,192 126,170"
          fill="var(--accent-dim)"
          stroke="var(--accent)"
          strokeWidth={1.5}
        />
        <text x={150} y={212} textAnchor="middle" className="fill-text-muted" fontSize={9}>
          {routingComplex ? "topic exchange" : "fanout exchange"}
        </text>
        <line x1={70} y1={170} x2={128} y2={170} stroke="var(--border-strong)" strokeWidth={1.5} />

        {/* Queues + consumers */}
        {queueYs.map((y, i) => (
          <g key={i}>
            <line x1={172} y1={170} x2={255} y2={y} stroke="var(--border-strong)" strokeWidth={1.5} />
            {routingComplex && (
              <text x={210} y={y - (y > 170 ? 6 : y < 170 ? -10 : -6)} textAnchor="middle" className="fill-text-faint font-mono" fontSize={8}>
                {routingKeys[i]}
              </text>
            )}
            <rect x={255} y={y - 17} width={72} height={34} rx={8} fill="var(--panel-raised)" stroke="var(--border-strong)" strokeWidth={1.5} />
            <text x={291} y={y + 4} textAnchor="middle" className="fill-text" fontSize={9} fontWeight={600}>
              queue
            </text>
            <line x1={327} y1={y} x2={360} y2={y} stroke="var(--border-strong)" strokeWidth={1.5} />
            <circle cx={378} cy={y} r={16} fill="var(--panel-raised)" stroke="var(--border-strong)" strokeWidth={1.5} />
            <text x={378} y={y + 3} textAnchor="middle" className="fill-text-muted" fontSize={8}>
              worker
            </text>
          </g>
        ))}
      </g>

      {/* Kafka side */}
      <g className="transition-opacity duration-300" style={{ opacity: kafkaOpacity }}>
        <text x={615} y={24} textAnchor="middle" className={leader === "kafka" ? "fill-accent" : "fill-text-faint"} fontSize={12} fontWeight={600}>
          Kafka — distributed log
        </text>

        {/* Producer */}
        <circle cx={475} cy={170} r={20} fill="var(--panel-raised)" stroke="var(--border-strong)" strokeWidth={1.5} />
        <text x={475} y={174} textAnchor="middle" className="fill-text-muted" fontSize={9}>
          producer
        </text>
        <line x1={495} y1={170} x2={563} y2={170} stroke="var(--border-strong)" strokeWidth={1.5} />

        {/* Topic: partitioned log */}
        <rect x={laneX0 - 10} y={44} width={laneX1 - laneX0 + 20} height={272} rx={12} fill="var(--panel)" stroke="var(--accent)" strokeWidth={1.5} />
        <text x={(laneX0 + laneX1) / 2} y={60} textAnchor="middle" className="fill-accent font-mono" fontSize={9}>
          topic · {partitionYs.length} partitions
        </text>

        {partitionYs.map((y, pi) => (
          <g key={pi}>
            <rect x={laneX0} y={y - 9} width={laneX1 - laneX0} height={18} rx={5} fill="var(--panel-raised)" />
            {Array.from({ length: segCount }, (_, si) => {
              const segW = (laneX1 - laneX0 - 12) / segCount - 3;
              const x = laneX0 + 6 + si * ((laneX1 - laneX0 - 12) / segCount);
              const isHead = si === segCount - 1;
              return (
                <rect
                  key={si}
                  x={x}
                  y={y - 6}
                  width={segW}
                  height={12}
                  rx={2}
                  fill={isHead ? "var(--accent)" : "var(--accent-dim)"}
                  className={isHead ? "animate-pulse" : undefined}
                />
              );
            })}
          </g>
        ))}

        {/* Consumer group offset cursors — different x per group, the whole teaching point of this side */}
        {(fanout ? [{ x: laneX0 + 55, label: "group A · caught up" }, { x: laneX0 + 15, label: "group B · replaying" }] : [{ x: laneX0 + 55, label: "1 consumer group" }]).map(
          (g, i) => (
            <g key={i}>
              <line
                x1={g.x}
                y1={38}
                x2={g.x}
                y2={320}
                stroke={i === 0 ? "var(--accent)" : "var(--border-strong)"}
                strokeWidth={1.5}
                strokeDasharray={i === 0 ? "none" : "3 3"}
              />
              <text x={g.x} y={332} textAnchor="middle" className={i === 0 ? "fill-accent font-mono" : "fill-text-faint font-mono"} fontSize={8}>
                {g.label}
              </text>
            </g>
          ),
        )}
      </g>
    </svg>
  );
}
