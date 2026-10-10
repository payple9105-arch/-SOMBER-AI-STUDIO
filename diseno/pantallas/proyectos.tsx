import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { deleteProject, saveProject } from "@/lib/somber.functions";
import { Card, GhostButton, PrimaryButton, StudioShell, controlClass, errorText } from "@/components/studio-shell";
import { useStudio } from "@/components/use-studio";

export const Route = createFileRoute("/proyectos")({ component: Proyectos });

function Proyectos() {
  const studio = useStudio();
  const [name, setName] = useState("");
  const [note, setNote] = useState<string | null>(null);

  if (studio.isPending || (studio.user && !studio.ready && !studio.error)) {
    return <main className="min-h-screen" />;
  }
  if (!studio.user) return <RedirectToSignIn />;

  return (
    <StudioShell title="Mis proyectos" kicker="Archivo" credits={studio.credits}>
      <Card className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className={`${controlClass} max-w-sm`}
          placeholder="Nombre del proyecto"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <PrimaryButton
          disabled={name.trim().length < 2}
          onClick={() =>
            void saveProject({ data: { name, kind: "video" } })
              .then(async () => {
                setName("");
                await studio.reload();
              })
              .catch((err: unknown) => setNote(errorText(err)))
          }
        >
          Crear
        </PrimaryButton>
      </Card>
      {studio.projects.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">No hay proyectos todavía. Crea uno o genera un video y se guardará solo.</p>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {studio.projects.map((project) => (
            <li key={project.id} className="rounded-card border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{project.name}</h2>
                  <p className="text-sm text-muted">
                    {project.kind} · {project.style} · {project.aspect} · {project.duration_sec}s · {project.status}
                  </p>
                  {project.description ? <p className="mt-1 text-sm">{project.description}</p> : null}
                </div>
                <div className="flex gap-2">
                  <Link
                    to="/editor"
                    search={{ proyecto: project.id }}
                    className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm"
                  >
                    Editar
                  </Link>
                  <GhostButton
                    onClick={() =>
                      void deleteProject({ data: { id: project.id } })
                        .then(() => studio.reload())
                        .catch((err: unknown) => setNote(errorText(err)))
                    }
                  >
                    Borrar
                  </GhostButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {note ? <p className="mt-4 text-sm text-danger">{note}</p> : null}
    </StudioShell>
  );
}
