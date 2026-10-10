import { Link } from "@tanstack/react-router";

export function Mark({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 text-fg">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 ring-1 ring-line">
        <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden="true">
          <path d="M7 8.5 18.5 16 7 23.5Z" fill="currentColor" className="text-electric" />
          <path d="M14 8.5 25.5 16 14 23.5Z" fill="currentColor" className="text-violet" opacity="0.9" />
        </svg>
      </span>
      <span className="leading-none">
        <span className="font-display block text-sm font-bold tracking-wide">SOMBER</span>
        <span className="text-xs tracking-widest text-muted">AI STUDIO</span>
      </span>
    </Link>
  );
}
