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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          {description && <p className="mt-2 max-w-[70ch] text-[15px] text-paper-dim">{description}</p>}
        </div>
        {meta && <div className="flex items-center gap-3">{meta}</div>}
      </div>
      <div className="double-rule mt-6 h-[5px]" role="presentation" />
    </header>
  );
}
