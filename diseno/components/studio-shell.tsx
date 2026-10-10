import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Clapperboard,
  Cloud,
  FolderOpen,
  House,
  Sparkles,
  UserRound,
  WandSparkles,
} from "lucide-react";
import { UserButton } from "@/lib/auth/gates";
import { Mark } from "@/components/mark";

const NAV = [
  { to: "/panel", label: "Panel", icon: House },
  { to: "/generar", label: "Crear", icon: WandSparkles },
  { to: "/anime", label: "Anime", icon: Sparkles },
  { to: "/editor", label: "Editor", icon: Clapperboard },
  { to: "/proyectos", label: "Proyectos", icon: FolderOpen },
  { to: "/nube", label: "Nube", icon: Cloud },
  { to: "/cuenta", label: "Cuenta", icon: UserRound },
] as const;

export function StudioShell({
  title,
  kicker,
  credits,
  children,
}: {
  title: string;
  kicker?: string;
  credits?: number;
  children: ReactNode;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen text-fg">
      <div className="mx-auto flex max-w-6xl gap-6 px-4 pb-24 pt-4 md:px-6 md:pb-10 md:pt-6 lg:pb-10">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-52 shrink-0 flex-col rounded-card border border-line bg-surface/90 p-3 lg:flex">
          <Mark to="/panel" />
          <nav className="mt-6 flex flex-1 flex-col gap-1">
            {NAV.map((item) => {
              const active = path === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={
                    "flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm " +
                    (active
                      ? "bg-surface-2 text-fg ring-1 ring-violet/50"
                      : "text-muted hover:bg-surface-2 hover:text-fg")
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Link to="/planes" className="px-3 py-2 text-xs text-muted hover:text-fg">
            Planes
          </Link>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="mb-5 flex items-start justify-between gap-3">
            <div className="lg:hidden">
              <Mark to="/panel" />
            </div>
            <div className="hidden lg:block">
              <p className="text-xs tracking-widest text-electric uppercase">{kicker}</p>
              <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {typeof credits === "number" ? (
                <Link
                  to="/cuenta"
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-fg"
                >
                  {credits >= 1_000_000_000 ? "Sin límite" : `${credits} créditos`}
                </Link>
              ) : null}
              <UserButton />
            </div>
          </header>
          <div className="mb-4 lg:hidden">
            <p className="text-xs tracking-widest text-electric uppercase">{kicker}</p>
            <h1 className="font-display text-2xl font-bold">{title}</h1>
          </div>
          {children}
          <nav className="mt-6 hidden gap-2 md:grid md:grid-cols-4 lg:hidden">
            {NAV.slice(0, 4).map((item) => {
              const active = path === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={
                    "flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line text-sm " +
                    (active ? "bg-surface-2 text-fg" : "text-muted")
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-bg/95 px-1 py-1 backdrop-blur md:hidden">
        {NAV.slice(0, 5).map((item) => {
          const active = path === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={
                "flex min-h-12 flex-col items-center justify-center gap-0.5 text-xs " +
                (active ? "text-electric" : "text-muted")
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-card border border-line bg-surface/90 p-4 ${className}`}>
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-muted">{label}</span>
      {children}
    </label>
  );
}

export const controlClass =
  "w-full rounded-xl border border-line bg-bg px-3 py-3 text-sm text-fg outline-none focus:border-electric";

export function PrimaryButton({
  children,
  disabled,
  type = "button",
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-violet px-5 text-sm font-semibold text-bg disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-4 text-sm text-fg disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function errorText(error: unknown) {
  if (error instanceof Error && error.message) {
    if (/unauthorized/i.test(error.message)) return "Inicia sesión para continuar.";
    return error.message;
  }
  return "Algo no salió bien. Inténtalo de nuevo.";
}
