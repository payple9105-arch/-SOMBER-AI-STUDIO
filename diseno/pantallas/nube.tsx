import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Cloud, Copy } from "lucide-react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import {
  Card,
  controlClass,
  errorText,
  Field,
  GhostButton,
  PrimaryButton,
  StudioShell,
} from "@/components/studio-shell";
import { useStudio } from "@/components/use-studio";
import { connectStudio, disconnectStudioCloud, studioCloud, type StudioCloud } from "@/lib/cloud.functions";
import { STUDIO_SQL } from "@/lib/studio-sql";

export const Route = createFileRoute("/nube")({ component: Nube });

function Nube() {
  const studio = useStudio();
  const [cloud, setCloud] = useState<StudioCloud | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [serviceKey, setServiceKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function pull() {
    setLoading(true);
    setError(null);
    try {
      setCloud(await studioCloud());
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!studio.user?.id) return;
    void pull();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studio.user?.id]);

  async function connect(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await connectStudio({ data: { url, serviceKey } });
      setServiceKey("");
      await pull();
      await studio.reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      await disconnectStudioCloud();
      await pull();
      await studio.reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function copySql() {
    try {
      await navigator.clipboard.writeText(STUDIO_SQL);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (studio.isPending) return <main className="min-h-screen" />;
  if (!studio.user) return <RedirectToSignIn />;

  const connected = cloud?.connected === true;

  return (
    <StudioShell title="Sombra IA Estudio" kicker="Supabase" credits={studio.credits}>
      <p className="mb-5 max-w-xl text-sm leading-relaxed text-muted">
        Los videos y los créditos viven en un proyecto nuevo de Supabase, separado de RobLoren.
        Créalo con el nombre <span className="text-fg">Sombra IA Estudio</span> y conéctalo aquí.
      </p>
      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      <Card className="mb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-electric">
            <Cloud className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold">
              {loading ? "Comprobando…" : connected ? "Conectado" : "Sin conectar"}
            </p>
            <p className="text-xs text-muted">{connected ? cloud?.host : "Aún no hay proyecto"}</p>
          </div>
        </div>
      </Card>

      {connected ? (
        <>
          <Card className="mb-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Videos guardados</h2>
              <GhostButton onClick={() => void disconnect()} disabled={busy}>
                Desconectar
              </GhostButton>
            </div>
            {cloud && cloud.videos.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                Todavía no hay videos en Supabase. El próximo que generes se guarda aquí, y los créditos se descuentan en el mismo proyecto.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {cloud?.videos.map((video) => (
                  <li key={video.id} className="py-3">
                    <p className="font-medium">{video.title || "Video"}</p>
                    <p className="text-sm text-muted">{video.prompt}</p>
                    <p className="mt-1 text-xs text-electric">{video.status}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : (
        <>
          <Card className="mb-4">
            <ol className="list-decimal space-y-2 pl-4 text-sm leading-relaxed text-muted">
              <li>Entra a Supabase y crea un proyecto llamado Sombra IA Estudio.</li>
              <li>Abre el SQL Editor y pega el script de abajo. Ejecútalo una vez.</li>
              <li>En Project Settings, API, copia la URL y la clave service_role.</li>
            </ol>
          </Card>
          <Card className="mb-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="font-semibold">SQL del proyecto</h2>
              <GhostButton onClick={() => void copySql()}>
                <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                {copied ? "Copiado" : "Copiar"}
              </GhostButton>
            </div>
            <textarea
              readOnly
              value={STUDIO_SQL}
              className={`${controlClass} h-48 font-mono text-xs`}
              aria-label="SQL para Sombra IA Estudio"
            />
          </Card>
          <Card>
            <h2 className="font-semibold">Conectar</h2>
            <form className="mt-3 space-y-3" onSubmit={(event) => void connect(event)}>
              <Field label="URL del proyecto">
                <input
                  className={controlClass}
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://xxxx.supabase.co"
                  autoComplete="off"
                  inputMode="url"
                />
              </Field>
              <Field label="Clave service_role">
                <input
                  className={controlClass}
                  type="password"
                  value={serviceKey}
                  onChange={(event) => setServiceKey(event.target.value)}
                  autoComplete="off"
                />
              </Field>
              <PrimaryButton type="submit" disabled={busy || loading}>
                Guardar en Sombra IA Estudio
              </PrimaryButton>
            </form>
          </Card>
        </>
      )}
    </StudioShell>
  );
}
