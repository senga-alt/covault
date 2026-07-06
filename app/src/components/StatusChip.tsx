import type { SeriesStatus } from "../lib/contract";

const styles: Record<SeriesStatus, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-success/15 text-success border-success/40" },
  expired: { label: "Awaiting settlement", cls: "bg-secondary/15 text-secondary border-secondary/40" },
  settled: { label: "Settled", cls: "bg-muted text-muted-foreground border-border" },
};

export function StatusChip({ status }: { status: SeriesStatus }) {
  const s = styles[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
