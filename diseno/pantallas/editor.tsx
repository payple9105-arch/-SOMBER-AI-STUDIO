import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { addClip, deleteClip, listClips, saveProject, updateClip } from "@/lib/somber.functions";
import {
  Card,
  Field,
  GhostButton,
  PrimaryButton,
  StudioShell,
  controlClass,
  errorText,
} from "@/components/studio-shell";
import { useStudio } from "@/components/use-studio";

export const Route = createFileRoute("/editor")({
  validateSearch: (search: Record<string, unknown>) => ({
    proyecto: typeof search.proyecto === "string" ? search.proyecto : "",
  }),
  component: Editor,
});

type Clip = Awaited<ReturnType<typeof listClips>>[number];

function Editor() {
  const search = Route.useSearch();
  const studio = useStudio();
  const [projectId, setProjectId] = useState(search.proyecto);
  const [clips, setClips] = useState<Clip[]>([]);
  const [playId, setPlayId] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [name, setName] = useState("Montaje");

  useEffect(() => {
    if (!projectId || !studio.user) return;
    listClips({ data: { projectId } })
      .then(setClips)
      .catch((err: unknown) => setNote(errorText(err)));
  }, [projectId, studio.user]);

  if (studio.isPending || (studio.user && !studio.ready && !studio.error)) {
    return <main className="min-h-screen" />;
  }
  if (!studio.user) return <RedirectToSignIn />;

  const current = clips.find((clip) => clip.id === playId) ?? clips[0];

  async function createProject() {
    const project = await saveProject({
      data: { name, kind: "editor", aspect: "16:9", durationSec: 8, style: "Montaje" },
    });
    setProjectId(project.id);
    await studio.reload();
  }

  async function pushAsset(assetId: string) {
    if (!projectId) return;
    const clip = await addClip({ data: { projectId, assetId, track: "V1" } });
    setClips((list) => [...list, clip]);
  }

  async function pushCaption() {
    if (!projectId || caption.trim().length < 1) return;
    const clip = await addClip({ data: { projectId, caption, track: "T1" } });
    setClips((list) => [...list, clip]);
    setCaption("");
  }

  async function refresh() {
    if (!projectId) return;
    setClips(await listClips({ data: { projectId } }));
  }

  function playNext(fromId: string) {
    const index = clips.findIndex((clip) => clip.id === fromId);
    const next = clips[index + 1];
    setPlayId(next?.id ?? null);
  }

  return (
    <StudioShell title="Editor" kicker="Línea de tiempo" credits={studio.credits}>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Proyecto">
          <select className={controlClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Elige uno</option>
            {studio.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </Field>
        <input className={`${controlClass} max-w-48`} value={name} onChange={(e) => setName(e.target.value)} />
        <PrimaryButton onClick={() => void createProject().catch((err: unknown) => setNote(errorText(err)))}>
          Nuevo montaje
        </PrimaryButton>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="overflow-hidden rounded-xl border border-line bg-bg">
            {current?.asset_kind === "video" && current.url ? (
              <video
                key={current.id}
                src={current.url}
                controls
                autoPlay
                className="aspect-video w-full"
                onEnded={() => playNext(current.id)}
              />
            ) : current?.asset_kind === "image" && current.url ? (
              <img src={current.url} alt={current.label} className="aspect-video w-full object-cover" />
            ) : current?.asset_kind === "audio" && current.url ? (
              <div className="grid aspect-video place-items-center p-6">
                <audio key={current.id} src={current.url} controls autoPlay onEnded={() => playNext(current.id)} />
              </div>
            ) : (
              <div className="grid aspect-video place-items-center px-6 text-center text-sm text-muted">
                Añade un clip de tu biblioteca para previsualizar la secuencia.
              </div>
            )}
          </div>
          {current?.caption ? (
            <p className="mt-3 text-center text-sm">{current.caption}</p>
          ) : null}
          <div className="mt-4 space-y-2">
            {clips.length === 0 ? (
              <p className="text-sm text-muted">La línea de tiempo está vacía.</p>
            ) : (
              clips.map((clip, index) => (
                <div
                  key={clip.id}
                  className={
                    "flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm " +
                    (current?.id === clip.id ? "border-electric bg-surface-2" : "border-line")
                  }
                >
                  <button type="button" className="min-h-10 flex-1 text-left" onClick={() => setPlayId(clip.id)}>
                    <span className="text-muted">{clip.track}</span> {clip.label}
                  </button>
                  <span className="text-xs text-muted">{Math.round(clip.duration_ms / 1000)}s</span>
                  <GhostButton
                    onClick={() =>
                      void updateClip({ data: { id: clip.id, direction: "up", durationMs: clip.duration_ms } })
                        .then(refresh)
                        .catch((err: unknown) => setNote(errorText(err)))
                    }
                  >
                    {index === 0 ? "·" : "Subir"}
                  </GhostButton>
                  <GhostButton
                    onClick={() =>
                      void updateClip({ data: { id: clip.id, direction: "down", durationMs: clip.duration_ms } }).then(
                        refresh,
                      )
                    }
                  >
                    Bajar
                  </GhostButton>
                  <GhostButton
                    onClick={() => void deleteClip({ data: { id: clip.id } }).then(() => refresh())}
                  >
                    Quitar
                  </GhostButton>
                </div>
              ))
            )}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Recortar dentro del archivo y unir todo en un solo mp4 necesita procesamiento de video en el servidor.
            Esta versión ordena escenas, reproduce la secuencia y guarda subtítulos. La música se añade si ya tienes
            un audio en la biblioteca.
          </p>
        </Card>
        <div className="space-y-4">
          <Card>
            <h2 className="font-semibold">Biblioteca</h2>
            <ul className="mt-3 max-h-80 space-y-2 overflow-auto">
              {studio.assets.length === 0 ? (
                <li className="text-sm text-muted">Genera una imagen, un video o una voz para llenar esto.</li>
              ) : (
                studio.assets.map((asset) => (
                  <li key={asset.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">
                      {asset.title}
                      <span className="text-muted"> · {asset.kind}</span>
                    </span>
                    <GhostButton disabled={!projectId} onClick={() => void pushAsset(asset.id)}>
                      Añadir
                    </GhostButton>
                  </li>
                ))
              )}
            </ul>
          </Card>
          <Card className="space-y-3">
            <Field label="Subtítulo desde el guion">
              <textarea
                className={`${controlClass} min-h-20`}
                value={caption}
                maxLength={180}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Una frase que aparece sobre el clip."
              />
            </Field>
            <PrimaryButton disabled={!projectId || !caption.trim()} onClick={() => void pushCaption()}>
              Poner texto
            </PrimaryButton>
            <p className="text-xs text-muted">
              Esto no transcribe el audio. Escribe el texto tú. El reconocimiento automático todavía no está conectado.
            </p>
          </Card>
        </div>
      </div>
      {note ? <p className="mt-4 text-sm text-danger">{note}</p> : null}
    </StudioShell>
  );
}
