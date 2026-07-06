import type { SeriesStatus } from "../lib/contract";

const styles: Record<SeriesStatus, { label: string; dot: string; cls: string }> = {
  active: { label: "Active", dot: "bg-gain", cls: "text-gain border-gain/40" },
  expired: { label: "Awaiting settlement", dot: "bg-gilt", cls: "text-paper-dim border-rule" },
  settled: { label: "Settled", dot: "bg-paper-dim", cls: "text-paper-dim border-rule" },
};

export function StatusChip({ status }: { status: SeriesStatus }) {
  const s = styles[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-0.5 text-xs font-medium ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}
