export type ComparisonRow = {
  label: string;
  /** One cell per entry in `columns`, same order. */
  values: React.ReactNode[];
};

/**
 * Generic side-by-side comparison table for study pages (Layer 4 vs Layer 7,
 * RabbitMQ vs Kafka, etc). First column is always the row label.
 */
export function ComparisonTable({ columns, rows }: { columns: string[]; rows: ComparisonRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-panel-raised text-xs font-semibold text-text-faint uppercase">
            <th className="px-3 py-2 font-medium">&nbsp;</th>
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-text-muted">
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-border last:border-b-0">
              <td className="px-3 py-2 font-medium text-text">{row.label}</td>
              {row.values.map((value, i) => (
                <td key={columns[i]} className="px-3 py-2">
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
