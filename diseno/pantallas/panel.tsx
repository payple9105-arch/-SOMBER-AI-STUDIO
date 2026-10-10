import { createFileRoute, Link } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { StudioShell, Card } from "@/components/studio-shell";
import { useStudio } from "@/components/use-studio";

export const Route = createFileRoute("/panel")({ component: Panel });

function Panel() {
  const studio = useStudio();
  if (studio.isPending || (studio.user && !studio.ready && !studio.error)) {
    return <main className="min-h-screen" />;
  }
  if (!studio.user) return <RedirectToSignIn />;

  const hello = studio.name || studio.user.displayName || "creador";

  return (
    <StudioShell title={`Hola, ${hello}`} kicker="Panel" credits={studio.credits}>
      {studio.error ? <p className="mb-4 text-sm text-danger">{studio.error}</p> : null}
      <p className="mb-5 max-w-xl text-sm text-muted">
        {(studio.credits ?? 0) >= 1_000_000_000
          ? "Tu cuenta de creador no tiene límite. Generar no descuenta créditos."
          : "Empiezas con créditos de prueba. Cada imagen, voz o video descuenta antes de llamar al modelo y se devuelve si la operación falla."}
      </p>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-card border border-line bg-surface p-3">
          <p className="text-lg font-semibold">{studio.projects.length}</p>
          <p className="text-xs text-muted">Proyectos</p>
        </div>
        <div className="rounded-card border border-line bg-surface p-3">
          <p className="text-lg font-semibold">{(studio.credits ?? 0) >= 1_000_000_000 ? "∞" : studio.credits ?? 0}</p>
          <p className="text-xs text-muted">Créditos</p>
        </div>
        <div className="rounded-card border border-line bg-surface p-3">
          <p className="text-lg font-semibold">3</p>
          <p className="text-xs text-muted">Formatos</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/generar" search={{ modo: "video" }} className="rounded-card border border-line bg-surface p-4">
          <p className="text-xs text-electric">Texto a video</p>
          <h2 className="font-display mt-1 text-xl font-bold">Nuevo video</h2>
        </Link>
        <Link to="/anime" className="rounded-card border border-line bg-surface p-4">
          <p className="text-xs text-violet">Especializado</p>
          <h2 className="font-display mt-1 text-xl font-bold">Anime Studio</h2>
        </Link>
        <Link to="/editor" search={{ proyecto: "" }} className="rounded-card border border-line bg-surface p-4">
          <h2 className="font-semibold">Editor de video</h2>
          <p className="mt-1 text-sm text-muted">Línea de tiempo, subtítulos y narración.</p>
        </Link>
        <Link to="/proyectos" className="rounded-card border border-line bg-surface p-4">
          <h2 className="font-semibold">Mis proyectos</h2>
          <p className="mt-1 text-sm text-muted">{studio.projects.length} guardados</p>
        </Link>
        <Link to="/nube" className="rounded-card border border-line bg-surface p-4 sm:col-span-2">
          <p className="text-xs text-electric">Supabase</p>
          <h2 className="font-semibold">Sombra IA Estudio</h2>
          <p className="mt-1 text-sm text-muted">Videos y créditos del proyecto nuevo.</p>
        </Link>
      </div>
      <Card className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Recientes</h2>
          <Link to="/proyectos" className="text-sm text-electric">
            Ver todos
          </Link>
        </div>
        {studio.projects.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay proyectos. El primero puede ser un clip de 5 segundos.</p>
        ) : (
          <ul className="divide-y divide-line">
            {studio.projects.slice(0, 5).map((project) => (
              <li key={project.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="block font-medium">{project.name}</span>
                  <span className="text-muted">
                    {project.style} · {project.aspect} · {project.status}
                  </span>
                </span>
                <Link to="/editor" search={{ proyecto: project.id }} className="text-electric">
                  Abrir
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </StudioShell>
  );
}
