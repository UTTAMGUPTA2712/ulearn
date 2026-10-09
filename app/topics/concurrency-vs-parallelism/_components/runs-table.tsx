import { Button } from "@/components/simulation/button";
import { cn } from "@/lib/utils/cn";

import { WORKLOAD_LABEL, formatSeconds, quadrantLabel } from "../_lib/engine";
import type { RunResult } from "../_lib/types";

/** Every finished run, newest first, so different models on the same workload can be compared side by side. */
export function RunsTable({ runs, onClear }: { runs: RunResult[]; onClear: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium tracking-wide text-text-faint uppercase">Your runs</p>
        {runs.length > 0 && (
          <Button onClick={onClear} className="px-2.5 py-0.5 text-xs">
            Clear
          </Button>
        )}
      </div>
      <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-panel">
        {runs.length === 0 ? (
          <p className="px-4 py-3 text-xs text-text-faint">
            Finished runs land here. Try the same workload under two different models and compare the wall clock.
          </p>
        ) : (
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-panel-raised text-[11px] text-text-faint uppercase">
                <th className="px-3 py-2 font-medium">Workload</th>
                <th className="px-3 py-2 font-medium">Model</th>
                <th className="px-3 py-2 text-right font-medium">Cores</th>
                <th className="px-3 py-2 text-right font-medium">Wall clock</th>
                <th className="px-3 py-2 text-right font-medium">vs sequential</th>
                <th className="px-3 py-2 text-right font-medium">Computing</th>
                <th className="px-3 py-2 text-right font-medium">Switches</th>
              </tr>
            </thead>
            <tbody className="text-text-muted">
              {runs.map((run, i) => (
                <tr key={run.id} className={cn("border-b border-border last:border-b-0", i === 0 && "text-text")}>
                  <td className="px-3 py-2">{WORKLOAD_LABEL[run.workload]}</td>
                  <td className="px-3 py-2">{quadrantLabel(run.scheduling, run.cores)}</td>
                  <td className="px-3 py-2 text-right font-mono">{run.cores}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold">{formatSeconds(run.wallMs)}</td>
                  <td
                    className={cn("px-3 py-2 text-right font-mono", run.speedup < 1 && "text-status-warn")}
                  >
                    {run.speedup.toFixed(2)}×
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{Math.round(run.utilization * 100)}%</td>
                  <td className="px-3 py-2 text-right font-mono">{run.switches}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
