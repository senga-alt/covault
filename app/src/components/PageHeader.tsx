/** Ledger-grade page header: title, teaching line, right-hand meta, and the
    double rule that marks major heads in the certificate grammar. */
export function PageHeader({
  title,
  description,
  meta,
}: {
  title: string;
  description?: string;
  meta?: React.ReactNode;
}) {
  return (
    <header className="mb-8">
      {/* title and meta share one row at every width - meta must not orphan below */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        {meta && <div className="flex shrink-0 items-center gap-3">{meta}</div>}
      </div>
      {description && <p className="mt-2 max-w-[60ch] text-[15px] text-paper-dim">{description}</p>}
      <div className="double-rule mt-6 h-[5px]" role="presentation" />
    </header>
  );
}
