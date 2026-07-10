import { GuillocheRosette } from "./Guilloche";

/**
 * Crafted empty state: an engraved rosette mark + a teaching line + optional
 * next action. Empties should orient the user, not read as a blank panel.
 * `compact` drops the mark for inline/in-panel empties (e.g. the order book).
 */
export function EmptyState({
  title,
  children,
  action,
  compact = false,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="px-4 py-6 text-sm text-paper-dim">
        <span className="font-medium text-paper">{title}</span> {children}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center border border-rule bg-ink-2/60 px-6 py-14 text-center">
      <GuillocheRosette className="mb-5 h-14 w-14 opacity-40" />
      <p className="font-display text-lg font-bold">{title}</p>
      {children && <p className="mt-2 max-w-sm text-sm text-paper-dim">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
