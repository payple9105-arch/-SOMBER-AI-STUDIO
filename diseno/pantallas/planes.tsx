import { createFileRoute, Link } from "@tanstack/react-router";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { Mark } from "@/components/mark";

export const Route = createFileRoute("/planes")({ component: Planes });

const PLANS = [
  {
    name: "Free",
    price: "0",
    text: "Para probar el estudio.",
    points: ["60 créditos de bienvenida", "Video corto en 480p", "Proyectos guardados en tu cuenta"],
  },
  {
    name: "Pro",
    price: "—",
    text: "Para quien publica cada semana.",
    points: ["Más créditos al mes", "720p con prioridad", "Anime Studio sin cola de prueba"],
  },
  {
    name: "Ultra",
    price: "—",
    text: "Para un estudio pequeño.",
    points: ["Mayor cupo de generación", "Formatos verticales de campaña", "Soporte cuando haya cobros reales"],
  },
];

function Planes() {
  return (
    <div className="min-h-screen text-fg">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Mark />
        <SignedOut>
          <Link to="/login" search={{ alta: false }} className="text-sm text-electric">
            Entrar
          </Link>
        </SignedOut>
        <SignedIn>
          <Link to="/panel" className="text-sm text-electric">
            Panel
          </Link>
        </SignedIn>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-16">
        <h1 className="font-display text-4xl font-bold">Planes</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Los cobros reales no están activados. Estas tarjetas muestran la dirección del producto, no un precio
          cerrado. El coste de cada generación depende del modelo y se descuenta en créditos antes de llamarlo.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <article key={plan.name} className="rounded-card border border-line bg-surface p-5">
              <h2 className="font-display text-2xl font-bold">{plan.name}</h2>
              <p className="mt-2 text-3xl font-semibold">
                {plan.price === "—" ? "Pronto" : `$${plan.price}`}
              </p>
              <p className="mt-2 text-sm text-muted">{plan.text}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {plan.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <p className="mt-6 text-xs text-muted">Sin pasarela de pago.</p>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
