import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { generateImage, generateVoice, saveProject, startVideo } from "@/lib/somber.functions";
import {
  Card,
  Field,
  PrimaryButton,
  StudioShell,
  controlClass,
  errorText,
} from "@/components/studio-shell";
import { useStudio } from "@/components/use-studio";

export const Route = createFileRoute("/anime")({ component: Anime });

const LOOKS = ["Shonen épico", "Ghibli suave", "Noir urbano", "Mecha nocturno", "Romance pastel"];

function Anime() {
  const studio = useStudio();
  const [name, setName] = useState("Escena 01");
  const [hero, setHero] = useState("");
  const [look, setLook] = useState(LOOKS[0]);
  const [place, setPlace] = useState("");
  const [action, setAction] = useState("");
  const [line, setLine] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [still, setStill] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (studio.isPending || (studio.user && !studio.ready && !studio.error)) {
    return <main className="min-h-screen" />;
  }
  if (!studio.user) return <RedirectToSignIn />;

  const prompt = [
    `Estilo anime ${look}.`,
    hero && `Personaje: ${hero}.`,
    place && `Escenario: ${place}.`,
    action && `Acción: ${action}.`,
    "Composición cinematográfica, colores vivos, sin texto.",
  ]
    .filter(Boolean)
    .join(" ");

  async function project() {
    if (projectId) return projectId;
    const saved = await saveProject({
      data: {
        name,
        kind: "anime",
        style: look,
        aspect: "9:16",
        durationSec: 5,
        description: prompt.slice(0, 180),
      },
    });
    setProjectId(saved.id);
    return saved.id;
  }

  async function stillImage() {
    setBusy(true);
    setNote(null);
    try {
      const id = await project();
      const image = await generateImage({ data: { prompt, projectId: id, title: name } });
      setStill(image.url);
      studio.setCredits(image.credits);
      setNote("Imagen de la escena guardada.");
      await studio.reload();
    } catch (err) {
      setNote(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function animate() {
    if (!still?.startsWith("https://")) {
      setNote("Primero genera la imagen. Solo se puede animar un enlace https del modelo.");
      return;
    }
    setBusy(true);
    setNote("Animación pedida. Sigue el progreso en Crear: el video entra a tu biblioteca al terminar.");
    try {
      const id = await project();
      const job = await startVideo({
        data: {
          prompt: `${prompt} Movimiento suave de cámara, el personaje cobra vida.`,
          projectId: id,
          aspect: "9:16",
          durationSec: 5,
          resolution: "480p",
          imageUrl: still,
        },
      });
      studio.setCredits(job.credits);
      setNote("El clip vertical de 5 segundos está en cola. Ábrelo desde Proyectos cuando figure como listo.");
      await studio.reload();
    } catch (err) {
      setNote(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function narrate() {
    setBusy(true);
    try {
      const id = await project();
      const voice = await generateVoice({ data: { text: line, projectId: id } });
      studio.setCredits(voice.credits);
      setNote("Narración guardada en el proyecto.");
      await studio.reload();
    } catch (err) {
      setNote(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const scenes = studio.assets.filter((asset) => !projectId || asset.project_id === projectId);

  return (
    <StudioShell title="Anime Studio" kicker="Escenas" credits={studio.credits}>
      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-4">
          <Field label="Nombre de la escena">
            <input className={controlClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Personaje">
            <textarea
              className={`${controlClass} min-h-20`}
              value={hero}
              onChange={(e) => setHero(e.target.value)}
              placeholder="Chica de pelo corto castaño, chaqueta clara, auriculares al cuello."
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Estilo visual">
              <select className={controlClass} value={look} onChange={(e) => setLook(e.target.value)}>
                {LOOKS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Escenario">
              <input
                className={controlClass}
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="Azotea, ciudad violeta, amanecer"
              />
            </Field>
          </div>
          <Field label="Qué ocurre">
            <input
              className={controlClass}
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="Se gira y el viento le mueve el pelo"
            />
          </Field>
          <div className="flex flex-wrap gap-3">
            <PrimaryButton disabled={busy || prompt.length < 20} onClick={() => void stillImage()}>
              Generar imagen · 4
            </PrimaryButton>
            <PrimaryButton disabled={busy || !still} onClick={() => void animate()}>
              Animar · 16
            </PrimaryButton>
          </div>
          <Field label="Narración de la escena">
            <textarea
              className={`${controlClass} min-h-20`}
              maxLength={500}
              value={line}
              onChange={(e) => setLine(e.target.value)}
            />
          </Field>
          <PrimaryButton disabled={busy || line.trim().length < 4} onClick={() => void narrate()}>
            Generar voz · 3
          </PrimaryButton>
          {note ? <p className="text-sm text-muted">{note}</p> : null}
        </Card>
        <div className="space-y-4">
          <Card>
            <h2 className="font-semibold">Cuadro</h2>
            <div className="mt-3 overflow-hidden rounded-xl border border-line bg-bg">
              {still ? (
                <img src={still} alt="Cuadro de la escena" className="aspect-[3/4] w-full object-cover sm:aspect-video" />
              ) : (
                <img
                  src="/gallery/portrait.jpg"
                  alt="Ejemplo de retrato de estudio, no es una generación tuya"
                  className="aspect-[3/4] w-full object-cover opacity-80 sm:aspect-video"
                />
              )}
            </div>
            {!still ? (
              <p className="mt-2 text-xs text-muted">La imagen de ejemplo es del estudio. La tuya la sustituye al generar.</p>
            ) : null}
          </Card>
          <Card>
            <h2 className="font-semibold">Piezas de esta sesión</h2>
            {scenes.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Aquí verás imágenes, clips y voces.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {scenes.slice(0, 8).map((asset) => (
                  <li key={asset.id} className="flex justify-between gap-3 border-b border-line py-2">
                    <span>{asset.title}</span>
                    <span className="text-muted">{asset.kind}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted">
              La música de fondo no está conectada. Exportar un único archivo montado llega con el procesador de video;
              hoy puedes ordenar la escena en el editor.
            </p>
          </Card>
        </div>
      </div>
    </StudioShell>
  );
}
