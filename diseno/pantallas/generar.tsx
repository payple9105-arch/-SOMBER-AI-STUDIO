import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import {
  enhancePrompt,
  generateImage,
  generateVoice,
  listVoices,
  pollJob,
  latestVideoJob,
  saveProject,
  startVideo,
} from "@/lib/somber.functions";
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

export const Route = createFileRoute("/generar")({
  validateSearch: (search: Record<string, unknown>) => ({
    modo: search.modo === "imagen" || search.modo === "voz" ? search.modo : "video",
  }),
  component: Generar,
});

const STYLES = ["Cinemático", "Anime", "Cyberpunk", "Documental", "Noir", "Acuarela"];

function costOf(modo: string, duration: number, resolution: string) {
  if (modo === "imagen") return 4;
  if (modo === "voz") return 3;
  const base = duration <= 5 ? 16 : duration <= 8 ? 24 : 30;
  return resolution === "720p" ? Math.round(base * 1.5) : base;
}

function Generar() {
  const initial = Route.useSearch().modo;
  const studio = useStudio();
  const [modo, setModo] = useState(initial);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("Cinemático");
  const [aspect, setAspect] = useState("16:9");
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState("480p");
  const [projectName, setProjectName] = useState("Mi primer video");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [voiceId, setVoiceId] = useState("eve");
  const [voices, setVoices] = useState<{ id: string; name: string }[]>([{ id: "eve", name: "Eve" }]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ kind: string; url: string } | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const cost = useMemo(() => costOf(modo, duration, resolution), [modo, duration, resolution]);

  useEffect(() => {
    if (modo !== "voz" || !studio.user) return;
    listVoices()
      .then((result) => setVoices(result.voices))
      .catch(() => undefined);
  }, [modo, studio.user]);

  useEffect(() => {
    if (!studio.ready) return;
    latestVideoJob()
      .then((job) => {
        if (job?.status === "pending") {
          setJobId(job.id);
          setBusy(true);
          setNote("Hay un video en proceso. Seguimos esperando el resultado.");
        }
      })
      .catch(() => undefined);
  }, [studio.ready]);

  useEffect(() => {
    if (!jobId) return;
    let ticks = 0;
    const timer = window.setInterval(() => {
      ticks += 1;
      setProgress(Math.min(92, ticks * 4));
      pollJob({ data: { id: jobId } })
        .then(async (job) => {
          studio.setCredits(job.credits);
          if (job.status === "listo" && job.result_url) {
            window.clearInterval(timer);
            setProgress(100);
            setPreview({ kind: "video", url: job.result_url });
            setNote("Video listo. El enlace del proveedor es temporal: descárgalo si quieres conservarlo.");
            setJobId(null);
            setBusy(false);
            await studio.reload();
          } else if (job.status === "fallido") {
            window.clearInterval(timer);
            setNote(job.error || "La generación falló y los créditos volvieron a tu saldo.");
            setJobId(null);
            setBusy(false);
          } else if (ticks > 48) {
            window.clearInterval(timer);
            setNote("Sigue en proceso. Vuelve a esta pantalla en un momento; no se cobrará de nuevo.");
            setBusy(false);
          }
        })
        .catch((err: unknown) => {
          window.clearInterval(timer);
          setNote(errorText(err));
          setBusy(false);
        });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [jobId]);

  if (studio.isPending || (studio.user && !studio.ready && !studio.error)) {
    return <main className="min-h-screen" />;
  }
  if (!studio.user) return <RedirectToSignIn />;

  async function ensureProject() {
    if (projectId) return projectId;
    const project = await saveProject({
      data: {
        name: projectName,
        kind: modo === "voz" ? "voz" : modo === "imagen" ? "imagen" : "video",
        style,
        aspect,
        durationSec: duration,
        description: prompt.slice(0, 180),
      },
    });
    setProjectId(project.id);
    return project.id;
  }

  async function run() {
    setBusy(true);
    setNote(null);
    try {
      const id = await ensureProject();
      const styled = `${prompt}\nEstilo: ${style}. Formato ${aspect}.`;
      if (modo === "imagen") {
        const image = await generateImage({ data: { prompt: styled, projectId: id, title: projectName } });
        studio.setCredits(image.credits);
        setPreview({ kind: "image", url: image.url });
        setImageUrl(image.url);
        setNote("Imagen guardada en el proyecto.");
        await studio.reload();
      } else if (modo === "voz") {
        const voice = await generateVoice({ data: { text: prompt, voiceId, projectId: id } });
        studio.setCredits(voice.credits);
        setPreview({ kind: "audio", url: voice.url });
        setNote("Narración guardada. Puedes colocarla en el editor.");
        await studio.reload();
      } else {
        const job = await startVideo({
          data: {
            prompt: styled,
            projectId: id,
            aspect,
            durationSec: duration,
            resolution,
            imageUrl: imageUrl || undefined,
            title: projectName,
          },
        });
        studio.setCredits(job.credits);
        setJobId(job.id);
        setProgress(8);
        setNote(imageUrl ? "Animando la imagen…" : "Generando el video…");
        return;
      }
      setBusy(false);
    } catch (err) {
      setNote(errorText(err));
      setBusy(false);
    }
  }

  async function improve() {
    setBusy(true);
    setNote(null);
    try {
      const result = await enhancePrompt({ data: { prompt, style } });
      setPrompt(result.text);
      await studio.reload();
      setNote("Instrucción reescrita. Cuesta 1 crédito.");
    } catch (err) {
      setNote(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <StudioShell
      title={modo === "voz" ? "Voces IA" : modo === "imagen" ? "Imagen" : "Generador"}
      kicker="Crear"
      credits={studio.credits}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["video", "Texto a video"],
            ["imagen", "Imagen"],
            ["voz", "Voz"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setModo(id)}
            className={
              "min-h-10 rounded-full px-4 text-sm " +
              (modo === id ? "bg-surface-2 text-fg ring-1 ring-electric" : "text-muted")
            }
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <Field label="Proyecto">
            <input className={controlClass} value={projectName} onChange={(e) => setProjectName(e.target.value)} />
          </Field>
          <Field label={modo === "voz" ? "Texto a narrar" : "Describe lo que quieres ver"}>
            <textarea
              className={`${controlClass} min-h-32`}
              maxLength={modo === "voz" ? 500 : 1000}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                modo === "voz"
                  ? "Una ciudad despierta bajo la lluvia…"
                  : "Un personaje camina por una azotea al amanecer, cámara lenta, luz violeta."
              }
            />
          </Field>
          {modo !== "voz" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Estilo">
                <select className={controlClass} value={style} onChange={(e) => setStyle(e.target.value)}>
                  {STYLES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Formato">
                <select className={controlClass} value={aspect} onChange={(e) => setAspect(e.target.value)}>
                  <option value="9:16">Vertical 9:16</option>
                  <option value="16:9">Horizontal 16:9</option>
                  <option value="1:1">Cuadrado 1:1</option>
                </select>
              </Field>
            </div>
          ) : (
            <Field label="Voz">
              <select className={controlClass} value={voiceId} onChange={(e) => setVoiceId(e.target.value)}>
                {voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {modo === "video" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Duración">
                  <select
                    className={controlClass}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  >
                    <option value={5}>5 segundos</option>
                    <option value={8}>8 segundos</option>
                    <option value={10}>10 segundos</option>
                  </select>
                </Field>
                <Field label="Resolución">
                  <select className={controlClass} value={resolution} onChange={(e) => setResolution(e.target.value)}>
                    <option value="480p">480p</option>
                    <option value="720p">720p</option>
                  </select>
                </Field>
              </div>
              <Field label="Animar una imagen (opcional)">
                <select
                  className={controlClass}
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                >
                  <option value="">Solo texto</option>
                  {studio.assets
                    .filter((asset) => asset.kind === "image" && asset.url?.startsWith("https://"))
                    .map((asset) => (
                      <option key={asset.id} value={asset.url ?? ""}>
                        {asset.title}
                      </option>
                    ))}
                </select>
              </Field>
            </>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <PrimaryButton disabled={busy || prompt.trim().length < 4} onClick={() => void run()}>
              {busy ? "Trabajando…" : `Generar · ${cost} créditos`}
            </PrimaryButton>
            {modo !== "voz" ? (
              <GhostButton disabled={busy || prompt.trim().length < 8} onClick={() => void improve()}>
                Mejorar texto · 1
              </GhostButton>
            ) : null}
          </div>
          {note ? <p className="text-sm text-muted">{note}</p> : null}
          {jobId ? (
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-bg">
                <div className="h-full bg-electric" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted">El video se genera en segundo plano. No cierres la idea: puedes esperar aquí.</p>
            </div>
          ) : null}
        </Card>
        <Card>
          <h2 className="font-semibold">Vista previa</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-line bg-bg">
            {preview?.kind === "video" ? (
              <video src={preview.url} controls className="aspect-video w-full" />
            ) : preview?.kind === "image" ? (
              <img src={preview.url} alt="Resultado generado" className="aspect-video w-full object-cover" />
            ) : preview?.kind === "audio" ? (
              <div className="p-6">
                <audio src={preview.url} controls className="w-full" />
              </div>
            ) : (
              <div className="grid aspect-video place-items-center px-6 text-center text-sm text-muted">
                El resultado aparece aquí y se guarda en el proyecto.
              </div>
            )}
          </div>
          {preview?.url && !preview.url.startsWith("data:") ? (
            <a href={preview.url} className="mt-3 inline-flex min-h-11 items-center text-sm text-electric" download>
              Descargar resultado
            </a>
          ) : null}
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Música automática y 1080p no están activos: el video usa el modelo ligero para no gastar de más.
            Los efectos de color del editor llegan después.
          </p>
        </Card>
      </div>
    </StudioShell>
  );
}
