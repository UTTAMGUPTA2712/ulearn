import { cn } from "@/lib/utils/cn";

import type { Recommendation } from "../_lib/types";

const BROKER_LABEL = { rabbitmq: "RabbitMQ", kafka: "Kafka" } as const;

function ScoreBar({ label, score, total, isLeader }: { label: string; score: number; total: number; isLeader: boolean }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 50;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className={cn("font-medium", isLeader ? "text-text" : "text-text-faint")}>{label}</span>
        <span className="font-mono text-text-faint">{score.toFixed(1)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-panel-raised">
        <div
          className={cn("h-full rounded-full transition-all duration-300", isLeader ? "bg-accent" : "bg-border-strong")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** The live-updating verdict: headline, a two-bar score meter, then every trait's reasoning attributed to the broker it favors. */
export function ResultPanel({ recommendation }: { recommendation: Recommendation }) {
  const { leader, rabbitScore, kafkaScore, reasons } = recommendation;
  const total = rabbitScore + kafkaScore;

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Recommendation</p>
      <h3 className="mt-1 text-lg font-semibold text-text">
        {leader === "either" ? (
          "Either works — this workload isn't testing what makes them different"
        ) : (
          <>
            <span className="text-accent">{BROKER_LABEL[leader]}</span>
          </>
        )}
      </h3>

      <div className="mt-3 space-y-2.5">
        <ScoreBar label="RabbitMQ" score={rabbitScore} total={total} isLeader={leader === "rabbitmq"} />
        <ScoreBar label="Kafka" score={kafkaScore} total={total} isLeader={leader === "kafka"} />
      </div>

      {reasons.length > 0 ? (
        <ul className="mt-4 space-y-2.5 border-t border-border pt-3 text-sm leading-relaxed text-text-muted">
          {reasons.map((r) => (
            <li key={r.text} className="flex gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                  r.broker === leader ? "bg-accent" : "bg-text-faint",
                )}
              />
              <span>
                <strong className="text-text">{BROKER_LABEL[r.broker]}:</strong> {r.text}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 border-t border-border pt-3 text-sm text-text-faint">
          Every trait is neutral here — set a few requirements to see the reasoning.
        </p>
      )}
    </div>
  );
}
