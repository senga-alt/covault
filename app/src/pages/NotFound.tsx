import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50dvh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-2xl font-bold">Page not found</p>
      <p className="mt-2 text-sm text-paper-dim">That route does not exist in Covault.</p>
      <div className="mt-6 flex gap-3">
        <Link
          to="/"
          className="rounded-[2px] border border-rule px-4 py-2 text-sm font-medium text-paper transition-colors duration-200 hover:bg-ink-3"
        >
          Home
        </Link>
        <Link
          to="/app"
          className="rounded-[2px] bg-seal px-4 py-2 text-sm font-bold text-on-seal transition duration-200 hover:bg-seal-hi active:scale-[0.98]"
        >
          Go to markets
        </Link>
      </div>
    </div>
  );
}
