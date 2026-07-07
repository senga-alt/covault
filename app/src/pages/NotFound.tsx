import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="border border-rule bg-ink-2 px-6 py-16 text-center">
      <p className="font-display text-2xl font-bold">Page not found</p>
      <p className="mt-2 text-sm text-paper-dim">That route does not exist in Covault.</p>
      <Link
        to="/app"
        className="mt-6 inline-block rounded-[2px] border border-rule px-4 py-2 text-sm font-medium text-paper transition-colors duration-200 hover:bg-ink-3"
      >
        Go to markets
      </Link>
    </div>
  );
}
