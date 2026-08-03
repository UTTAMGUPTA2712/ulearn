/** A single named concept inside a study-page Section (e.g. one routing algorithm). */
export function ConceptCard({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-panel p-4 shadow-sm">
      <p className="text-sm font-semibold text-text">{name}</p>
      <div className="mt-2 text-sm leading-relaxed text-text-muted">{children}</div>
    </div>
  );
}
