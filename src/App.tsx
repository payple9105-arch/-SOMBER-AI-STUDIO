import { useEffect, useRef, useState } from "react";
import {
  supabase,
  supabaseConfigured,
  fetchProfile,
  spendCredits,
  refundCredits,
  insertJob,
  updateJob,
  listMyJobs,
  type Profile,
  type JobRow,
} from "./lib/supabase";

type ApiResult = {
  nombre?: string;
  estado?: string;
  mensaje?: string;
  request_id?: string;
  status_url?: string;
  video_url?: string;
  pasos?: string[];
};

const API_URL = "https://somber-ai-studio-api.onrender.com";
const CREDIT_COST = 1;
const RATE_KEY = "somber-gen-ts";
const RATE_MAX = 20;
const RATE_WINDOW = 60 * 60 * 1000;

const SCREENS = [
  "Inicio",
  "Crear video",
  "Anime",
  "Editor",
  "Proyectos",
  "Nube",
  "Planes",
  "Pago",
  "Panel",
  "Cuenta",
  "Soporte",
  "Términos",
  "Privacidad",
] as const;

type Screen = (typeof SCREENS)[number] | "Entrar";

const base = import.meta.env.BASE_URL;
const COVERS = [`${base}gallery/hero.jpg`, `${base}gallery/neon.jpg`, `${base}gallery/mesa.jpg`, `${base}gallery/portrait.jpg`];
const STYLES = [
  ["Cinemático", "cinematico"],
  ["Anime", "anime"],
  ["Cyberpunk", "cyberpunk"],
  ["Documental", "documental"],
  ["Noir", "noir"],
  ["Acuarela", "acuarela"],
] as const;
const ANIME_STYLES = [
  ["Shonen épico", "shonen"],
  ["Ghibli suave", "ghibli"],
  ["Noir urbano", "noir"],
  ["Mecha nocturno", "mecha"],
  ["Romance pastel", "romance"],
] as const;
const PROJECTS = [
  ["Batalla épica", "16:9", COVERS[0]],
  ["Paisaje futurista", "16:9", COVERS[1]],
  ["Anime · Guerrero", "1:1", COVERS[3]],
  ["Ciudad nocturna", "9:16", COVERS[2]],
] as const;

function canGenerateLocal(): boolean {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    const list: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    return list.filter((t) => now - t < RATE_WINDOW).length < RATE_MAX;
  } catch {
    return true;
  }
}

function markGenerateLocal() {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    const list: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const recent = list.filter((t) => now - t < RATE_WINDOW);
    recent.push(now);
    localStorage.setItem(RATE_KEY, JSON.stringify(recent));
  } catch {}
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("Inicio");
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState("9:16");
  const [seconds, setSeconds] = useState("5s");
  const [look, setLook] = useState("Cinemático");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setApiResult] = useState<ApiResult | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modeAuth, setModeAuth] = useState<"login" | "register">("login");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessionEmail, setSessionEmail] = useState("");
  const [files, setFiles] = useState<{ id: string; name: string; type: string; url: string }[]>([]);
  const [planActivo, setPlanActivo] = useState("Basico");
  const [planElegido, setPlanElegido] = useState("Pro");
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (screen === "Anime") setLook((c) => (ANIME_STYLES.some(([n]) => n === c) ? c : "Shonen épico"));
    if (screen === "Crear video") setLook((c) => (STYLES.some(([n]) => n === c) ? c : "Cinemático"));
  }, [screen]);

  useEffect(() => {
    setPlanActivo(localStorage.getItem("somber-plan-activa") || "Basico");
    const request = indexedDB.open("somber-studio", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files", { keyPath: "id" });
    request.onsuccess = () => {
      const read = request.result.transaction("files").objectStore("files").getAll();
      read.onsuccess = () => {
        const rows = read.result as { id: string; name: string; type: string; blob: Blob }[];
        setFiles(rows.map((row) => ({ id: row.id, name: row.name, type: row.type, url: URL.createObjectURL(row.blob) })));
      };
    };
    fetch(`${API_URL}/health`)
      .then((r) => r.json())
      .then((d) => setApiOk(!!d?.fal_configurado || d?.estado === "activo"))
      .catch(() => setApiOk(false));

    if (!supabase) return;

    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!user) return;
      setSessionEmail(user.email || "");
      try {
        const p = await fetchProfile(user.id);
        setProfile(p);
        if (p?.plan) setPlanActivo(p.plan);
        setJobs(await listMyJobs(20));
      } catch (e) {
        console.error(e);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user;
      if (!user) {
        setSessionEmail("");
        setProfile(null);
        setJobs([]);
        return;
      }
      setSessionEmail(user.email || "");
      try {
        const p = await fetchProfile(user.id);
        setProfile(p);
        if (p?.plan) setPlanActivo(p.plan);
        setJobs(await listMyJobs(20));
      } catch (e) {
        console.error(e);
      }
    });

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      sub.subscription.unsubscribe();
    };
  }, []);

  function saveDeviceFile(file: File) {
    if (file.size > 18 * 1024 * 1024) {
      setNotice("Archivo demasiado grande (máx. 18 MB).");
      return;
    }
    const id = crypto.randomUUID();
    const request = indexedDB.open("somber-studio", 1);
    request.onsuccess = () => {
      const tx = request.result.transaction("files", "readwrite");
      tx.objectStore("files").put({ id, name: file.name, type: file.type, blob: file });
      tx.oncomplete = () =>
        setFiles((current) => [{ id, name: file.name, type: file.type, url: URL.createObjectURL(file) }, ...current]);
    };
  }

  async function pollJob(requestId: string, jobDbId?: string, statusUrl?: string) {
    const url = statusUrl || `${API_URL}/generate/${requestId}`;
    try {
      const r = await fetch(url);
      if (!r.ok) return;
      const data = await r.json();
      const status = (data.status || data.estado || "").toLowerCase();
      const video = data.video_url || data.video || data.output?.video?.url || data.response?.video?.url;
      if (status === "completed" || status === "ok" || video) {
        setApiResult((prev) => ({ ...(prev || {}), estado: "completed", video_url: video, mensaje: "Listo" }));
        if (jobDbId && supabaseConfigured) {
          try {
            await updateJob(jobDbId, { status: "completed", video_url: video || null });
            setJobs(await listMyJobs(20));
          } catch {}
        }
        if (pollRef.current) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
        setBusy(false);
        setNotice(video ? "Video listo." : "Generación completada.");
      } else if (status === "failed" || status === "error") {
        setApiResult((prev) => ({ ...(prev || {}), estado: "error", mensaje: data.detail || data.mensaje || "Falló" }));
        if (jobDbId && supabaseConfigured) {
          try {
            await updateJob(jobDbId, { status: "error", error_message: String(data.detail || data.mensaje || "error") });
            if (profile && !profile.is_creator) {
              const p = await refundCredits(CREDIT_COST, "refund_failed_job");
              setProfile(p);
            }
            setJobs(await listMyJobs(20));
          } catch {}
        }
        if (pollRef.current) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
        setBusy(false);
        setNotice("La generación falló. Intenta de nuevo.");
      }
    } catch {}
  }

  async function handleCreate(kind: "video" | "anime") {
    if (prompt.trim().length < 8) {
      setNotice("Escribe una descripción un poco más larga.");
      return;
    }
    if (!canGenerateLocal()) {
      setNotice(`Límite de ${RATE_MAX} generaciones por hora en este navegador.`);
      return;
    }
    if (supabaseConfigured && !sessionEmail) {
      setNotice("Entra con tu cuenta para generar (así se guardan créditos y proyectos).");
      setScreen("Entrar");
      return;
    }
    setNotice("");
    setApiResult(null);
    setBusy(true);
    const text = [prompt.trim(), `Estilo: ${look}.`, `Formato: ${format}.`, `Duración: ${seconds}.`].filter(Boolean).join("\n");

    let jobDbId: string | undefined;
    try {
      if (supabaseConfigured && sessionEmail) {
        try {
          const p = await spendCredits(CREDIT_COST, kind === "anime" ? "generate_anime" : "generate_video");
          setProfile(p);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          setBusy(false);
          setNotice(msg.includes("insuficientes") ? "No te quedan créditos. Mejora tu plan." : msg);
          return;
        }
      }

      const response = await fetch(`${API_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, aspect: format, duration_sec: parseInt(seconds, 10) || 5 }),
      });
      if (response.status === 429) {
        setNotice("Límite del servidor alcanzado. Intenta más tarde.");
        setBusy(false);
        return;
      }
      if (!response.ok) throw new Error(`El servidor respondió ${response.status}.`);
      const data = (await response.json()) as ApiResult;
      setApiResult(data);
      markGenerateLocal();

      if (supabaseConfigured && sessionEmail) {
        try {
          const row = await insertJob({
            prompt: prompt.trim(),
            style: look,
            aspect: format,
            duration_sec: parseInt(seconds, 10) || 5,
            provider_request_id: data.request_id,
            status: data.estado || "queued",
          });
          jobDbId = row.id;
          setJobs(await listMyJobs(20));
        } catch (e) {
          console.error(e);
        }
      }

      const rid = data.request_id || String(Date.now());
      if (data.request_id || data.status_url) {
        setNotice("Generando… esto puede tardar 1–2 minutos.");
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = window.setInterval(() => void pollJob(rid, jobDbId, data.status_url), 4000);
        void pollJob(rid, jobDbId, data.status_url);
      } else {
        setBusy(false);
        setNotice(data.estado === "error" ? "No se pudo procesar." : "Instrucción recibida.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No pudimos conectar con SOMBER AI.");
      setBusy(false);
    }
  }

  async function handleAuth(event: React.FormEvent) {
    event.preventDefault();
    if (!email.includes("@") || password.length < 8) {
      setNotice("Usa un correo y una contraseña de al menos 8 caracteres.");
      return;
    }
    if (!supabase) {
      setSessionEmail(email);
      setNotice("Supabase aún no está configurado. Sesión solo local.");
      setScreen("Inicio");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      if (modeAuth === "register") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          setSessionEmail(data.user.email || email);
          try {
            const p = await fetchProfile(data.user.id);
            setProfile(p);
          } catch {}
          setNotice("Cuenta creada. Ya puedes generar.");
          setScreen("Inicio");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setSessionEmail(data.user?.email || email);
        if (data.user) {
          const p = await fetchProfile(data.user.id);
          setProfile(p);
          setJobs(await listMyJobs(20));
        }
        setScreen("Inicio");
      }
    } catch (e: unknown) {
      setNotice(e instanceof Error ? e.message : "No se pudo autenticar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    setSessionEmail("");
    setProfile(null);
    setJobs([]);
    setScreen("Inicio");
  }

  const creditsLabel = profile
    ? profile.is_creator
      ? "∞"
      : String(profile.credits)
    : sessionEmail
      ? "…"
      : "—";

  return (
    <div className="app">
      {screen !== "Entrar" && screen !== "Términos" && screen !== "Privacidad" ? (
        <aside className="side">
          <button className="brand" onClick={() => setScreen("Inicio")}>
            <span>S</span>
            <strong>
              SOMBER AI
              <small>STUDIO</small>
            </strong>
          </button>
          <nav>
            {SCREENS.filter((s) => !["Términos", "Privacidad", "Soporte"].includes(s)).map((item) => (
              <button key={item} className={screen === item ? "on" : ""} onClick={() => setScreen(item)}>
                {item === "Panel" ? "Panel de control" : item === "Cuenta" ? "Configuración" : item}
              </button>
            ))}
            <button className={screen === "Soporte" ? "on" : ""} onClick={() => setScreen("Soporte")}>
              Soporte
            </button>
          </nav>
          <div className="side-foot">
            <button className="ghost" onClick={() => setScreen("Términos")}>
              Términos
            </button>
            <button className="ghost" onClick={() => setScreen("Privacidad")}>
              Privacidad
            </button>
          </div>
        </aside>
      ) : null}
      <div className="main">
        {screen !== "Entrar" && screen !== "Términos" && screen !== "Privacidad" ? (
          <header className="top">
            <div className="banner">
              <span className="dot" />
              Beta · {apiOk === null ? "API…" : apiOk ? "API lista" : "API limitada"}
              {supabaseConfigured ? " · Supabase" : " · sin Supabase"}
              {" · "}
              créditos: {creditsLabel}
            </div>
            <input placeholder="Buscar proyectos…" onKeyDown={(e) => e.key === "Enter" && setScreen("Proyectos")} />
            <button className="ghost" onClick={() => setScreen(sessionEmail ? "Cuenta" : "Entrar")}>
              {sessionEmail ? sessionEmail.split("@")[0] : "Entrar"}
            </button>
          </header>
        ) : null}
        <section className="view">
          {screen === "Inicio" ? (
            <>
              <p className="muted">Bienvenido a</p>
              <h1>SOMBER AI STUDIO</h1>
              <p className="muted">Convierte tus ideas en videos con IA. Beta pública{profile?.is_creator ? " · cuenta creadora" : ""}.</p>
              <div className="row">
                <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe el video que quieres crear…" />
                <button className="btn" onClick={() => setScreen("Crear video")}>
                  Generar
                </button>
              </div>
              <div className="chips">
                <button onClick={() => setScreen("Crear video")}>Videos realistas</button>
                <button onClick={() => setScreen("Anime")}>Estilo anime</button>
                <button onClick={() => setScreen("Editor")}>Edición</button>
                <button onClick={() => setScreen("Nube")}>Mis archivos</button>
              </div>
              <h2>Proyectos de ejemplo</h2>
              <div className="grid">
                {PROJECTS.map(([name, ratio, src]) => (
                  <article key={name} className="tile">
                    <img src={src} alt="" />
                    <div>
                      <strong>{name}</strong>
                      <small>{ratio}</small>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          {(screen === "Crear video" || screen === "Anime") ? (
            <div className="split">
              <form className="card" onSubmit={(e) => { e.preventDefault(); void handleCreate(screen === "Anime" ? "anime" : "video"); }}>
                <h1>{screen === "Anime" ? "Crea videos de anime con IA" : "Crear un nuevo video"}</h1>
                <p className="muted">Coste: {CREDIT_COST} crédito{profile?.is_creator ? " (cuenta creadora: sin límite)" : ""}.</p>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe la escena…" />
                <p className="muted">Estilo</p>
                <div className="styles">
                  {(screen === "Anime" ? ANIME_STYLES : STYLES).map(([name, file]) => (
                    <button key={name} type="button" className={look === name ? "style-card on" : "style-card"} onClick={() => setLook(name)}>
                      <img src={`${base}gallery/${file}.jpg`} alt="" />
                      <span className="style-label">{name}</span>
                    </button>
                  ))}
                </div>
                <p className="muted">Relación de aspecto</p>
                <div className="chips">
                  {["9:16", "16:9", "1:1"].map((item) => (
                    <button type="button" key={item} className={format === item ? "on" : ""} onClick={() => setFormat(item)}>{item}</button>
                  ))}
                </div>
                <p className="muted">Duración</p>
                <div className="chips">
                  {["5s", "10s"].map((item) => (
                    <button type="button" key={item} className={seconds === item ? "on" : ""} onClick={() => setSeconds(item)}>{item}</button>
                  ))}
                </div>
                <button className="btn wide" disabled={busy}>{busy ? "Generando…" : "Generar video"}</button>
                {notice ? <p className="notice">{notice}</p> : null}
                {result?.video_url ? <div className="result"><video className="player" controls src={result.video_url} /></div> : null}
              </form>
              <aside className="card tips">
                <h2>Consejos</h2>
                <p>Sé específico en la descripción.</p>
                <p>Vertical 9:16 para Reels / TikTok / Shorts.</p>
                <p>Inicia sesión para guardar proyectos y créditos en la nube.</p>
              </aside>
            </div>
          ) : null}

          {screen === "Editor" ? (
            <>
              <h1>Editor de video</h1>
              {files.find((f) => f.type.startsWith("video/")) ? (
                <video className="player" controls src={files.find((f) => f.type.startsWith("video/"))?.url} />
              ) : (
                <div className="player">Sube un video en Nube o genera uno</div>
              )}
              <div className="lane"><span>Video</span><i /></div>
              <div className="lane"><span>Audio</span><b /></div>
              <button className="btn" onClick={() => setScreen("Nube")}>Abrir archivos</button>
            </>
          ) : null}

          {screen === "Proyectos" ? (
            <>
              <h1>Mis proyectos</h1>
              <div className="grid">
                {PROJECTS.map(([name, ratio, src]) => (
                  <article key={name} className="tile">
                    <img src={src} alt="" />
                    <div><strong>{name}</strong><small>{ratio}</small></div>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          {screen === "Nube" ? (
            <>
              <h1>Mi nube (dispositivo)</h1>
              <p className="muted">Archivos locales en este navegador.</p>
              <label className="btn">
                Subir archivo
                <input hidden type="file" accept="video/*,image/*,audio/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) saveDeviceFile(file);
                }} />
              </label>
              {files.length === 0 ? <p className="muted">Todavía no hay archivos.</p> : null}
              <div className="grid">
                {files.map((file) => (
                  <article key={file.id} className="card">
                    <strong>{file.name}</strong>
                    <small>{file.type}</small>
                    {file.type.startsWith("video/") ? <video className="player" controls src={file.url} /> : null}
                  </article>
                ))}
              </div>
            </>
          ) : null}

          {screen === "Planes" ? (
            <>
              <h1>Planes</h1>
              <div className="plans">
                {[["Basico","$0","20 créditos","Comenzar"],["Pro","$12","Más generaciones","Mejorar"],["Estudio","$29","Profesional","Mejorar"]].map(([name, price, text, action]) => (
                  <article key={name} className={name === "Pro" ? "card pop" : "card"}>
                    <h2>{name}</h2>
                    <p className="price">{price}<small>/mes</small></p>
                    <p className="muted">{text}</p>
                    <button className="btn wide" onClick={() => { setPlanElegido(name); setScreen("Pago"); }}>{action}</button>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          {screen === "Pago" ? (
            <>
              <h1>Pago y suscripciones</h1>
              <p className="muted">Plan activo: <strong>{profile?.plan || planActivo}</strong>.</p>
              <button className="btn" onClick={() => {
                localStorage.setItem("somber-plan-activa", planElegido);
                setPlanActivo(planElegido);
                setNotice(`Plan ${planElegido} marcado.`);
              }}>Activar {planElegido}</button>
              {notice ? <p className="notice">{notice}</p> : null}
            </>
          ) : null}

          {screen === "Panel" ? (
            <>
              <h1>Panel de control</h1>
              <div className="stats">
                {[["Videos", String(jobs.filter((j) => j.status === "completed").length)],["Trabajos", String(jobs.length)],["Créditos", creditsLabel],["Plan", profile?.plan || planActivo]].map(([k, v]) => (
                  <article key={k} className="card"><span className="muted">{k}</span><strong>{v}</strong></article>
                ))}
              </div>
            </>
          ) : null}

          {screen === "Cuenta" ? (
            <>
              <h1>Cuenta</h1>
              <p className="muted">{sessionEmail || "Sin sesión"}</p>
              <p>Plan: <strong>{profile?.plan || planActivo}</strong> · Créditos: <strong>{creditsLabel}</strong></p>
              {profile?.is_creator ? <p className="muted">Cuenta creadora sin límite.</p> : null}
              <button className="btn" onClick={() => void handleLogout()}>Cerrar sesión</button>
            </>
          ) : null}

          {screen === "Soporte" ? (
            <>
              <h1>Soporte</h1>
              <p className="muted">Escribe a payple9105@gmail.com</p>
            </>
          ) : null}

          {(screen === "Términos" || screen === "Privacidad") ? (
            <div className="legal">
              <h1>{screen === "Términos" ? "Términos de uso" : "Política de privacidad"}</h1>
              <p className="muted">Beta pública · Actualizado noviembre 2026</p>
              <p>{screen === "Términos" ? "SOMBER AI STUDIO es un servicio en fase beta." : "Con Supabase guardamos correo, plan y créditos."}</p>
              <button className="btn" onClick={() => setScreen("Inicio")}>Volver</button>
            </div>
          ) : null}

          {screen === "Entrar" ? (
            <form className="login" onSubmit={(e) => void handleAuth(e)}>
              <button type="button" className="brand center" onClick={() => setScreen("Inicio")}>
                <span>S</span>
                <strong>SOMBER AI STUDIO<small>Tu imaginación, nuestro poder.</small></strong>
              </button>
              <h1>{modeAuth === "login" ? "Iniciar sesión" : "Crear cuenta"}</h1>
              <label>Correo electrónico<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
              <label>Contraseña<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={8} required /></label>
              {notice ? <p className="notice">{notice}</p> : null}
              <button className="btn wide" disabled={busy}>{busy ? "Espera…" : modeAuth === "login" ? "Entrar" : "Registrarme"}</button>
              <button type="button" className="ghost" onClick={() => setModeAuth((m) => (m === "login" ? "register" : "login"))}>
                {modeAuth === "login" ? "¿No tienes cuenta? Regístrate" : "Ya tengo cuenta"}
              </button>
            </form>
          ) : null}
        </section>
        <footer className="site-footer">
          <button className="ghost" onClick={() => setScreen("Términos")}>Términos</button>
          <button className="ghost" onClick={() => setScreen("Privacidad")}>Privacidad</button>
          <button className="ghost" onClick={() => setScreen("Soporte")}>Soporte</button>
          <span className="muted">SOMBER AI STUDIO · beta</span>
        </footer>
      </div>
      <nav className="mobile">
        {([["Inicio","Inicio"],["Crear video","Crear"],["Anime","Anime"],["Nube","Nube"],["Pago","Pago"]] as const).map(([id, label]) => (
          <button key={id} type="button" className={screen === id ? "on" : ""} onClick={() => setScreen(id)}>{label}</button>
        ))}
      </nav>
    </div>
  );
}
