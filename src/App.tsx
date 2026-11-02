import { useEffect, useRef, useState } from "react";

type ApiResult = {
  nombre?: string;
  etapa?: number;
  estado?: string;
  mensaje?: string;
  request_id?: string;
  status_url?: string;
  response_url?: string;
  video_url?: string;
  instruccion?: Record<string, unknown>;
  pasos?: string[];
  avisos?: string[];
  entorno?: Record<string, unknown>;
  resultado?: unknown;
};

const API_URL = "https://somber-ai-studio-api.onrender.com";
const RATE_KEY = "somber-gen-ts";
const RATE_MAX = 8;
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

function canGenerate(): boolean {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    const list: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const recent = list.filter((t) => now - t < RATE_WINDOW);
    return recent.length < RATE_MAX;
  } catch {
    return true;
  }
}

function markGenerate() {
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
  const [session, setSession] = useState("");
  const [files, setFiles] = useState<{ id: string; name: string; type: string; url: string }[]>([]);
  const [planActivo, setPlanActivo] = useState("Básico");
  const [planElegido, setPlanElegido] = useState("Pro");
  const [jobs, setJobs] = useState<{ id: string; text: string; status: string; video?: string; at: number }[]>([]);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (screen === "Anime") setLook((c) => (ANIME_STYLES.some(([n]) => n === c) ? c : "Shonen épico"));
    if (screen === "Crear video") setLook((c) => (STYLES.some(([n]) => n === c) ? c : "Cinemático"));
  }, [screen]);

  useEffect(() => {
    setPlanActivo(localStorage.getItem("somber-plan-activa") || "Básico");
    try {
      const j = localStorage.getItem("somber-jobs");
      if (j) setJobs(JSON.parse(j));
    } catch {}
    const request = indexedDB.open("somber-studio", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files", { keyPath: "id" });
    request.onsuccess = () => {
      const read = request.result.transaction("files").objectStore("files").getAll();
      read.onsuccess = () => {
        const rows = read.result as { id: string; name: string; type: string; blob: Blob }[];
        setFiles(rows.map((row) => ({ id: row.id, name: row.name, type: row.type, url: URL.createObjectURL(row.blob) })));
      };
    };
    fetch(`${API_URL}/health`).then((r) => r.json()).then((d) => setApiOk(!!d?.fal_configurado || d?.estado === "ok")).catch(() => setApiOk(false));
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
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
      tx.oncomplete = () => setFiles((current) => [{ id, name: file.name, type: file.type, url: URL.createObjectURL(file) }, ...current]);
    };
  }

  function persistJobs(next: typeof jobs) {
    setJobs(next);
    try {
      localStorage.setItem("somber-jobs", JSON.stringify(next.slice(0, 20)));
    } catch {}
  }

  async function pollJob(requestId: string, statusUrl?: string) {
    const url = statusUrl || `${API_URL}/generate/${requestId}`;
    try {
      const r = await fetch(url);
      if (!r.ok) return;
      const data = await r.json();
      const status = (data.status || data.estado || "").toLowerCase();
      const video = data.video_url || data.video || data.output?.video?.url || data.response?.video?.url;
      if (status === "completed" || status === "ok" || video) {
        setApiResult((prev) => ({ ...(prev || {}), estado: "completed", video_url: video, mensaje: "Listo" }));
        persistJobs(
          jobs.map((j) => (j.id === requestId ? { ...j, status: "completed", video } : j))
        );
        if (pollRef.current) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
        setBusy(false);
        setNotice(video ? "Video listo." : "Generación completada.");
      } else if (status === "failed" || status === "error") {
        setApiResult((prev) => ({ ...(prev || {}), estado: "error", mensaje: data.detail || data.mensaje || "Falló" }));
        persistJobs(jobs.map((j) => (j.id === requestId ? { ...j, status: "error" } : j)));
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
    if (!canGenerate()) {
      setNotice(`Límite de ${RATE_MAX} generaciones por hora en este navegador. Espera un poco.`);
      return;
    }
    setNotice("");
    setApiResult(null);
    setBusy(true);
    const text = [prompt.trim(), `Estilo: ${look}.`, `Formato: ${format}.`, `Duración: ${seconds}.`]
      .filter(Boolean)
      .join("\n");
    try {
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
      markGenerate();
      const rid = data.request_id || String(Date.now());
      const entry = { id: rid, text: prompt.trim().slice(0, 80), status: data.estado || "queued", at: Date.now() };
      persistJobs([entry, ...jobs].slice(0, 20));
      if (data.request_id || data.status_url) {
        setNotice("Generando… esto puede tardar 1–2 minutos.");
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = window.setInterval(() => void pollJob(rid, data.status_url), 4000);
        void pollJob(rid, data.status_url);
      } else {
        setBusy(false);
        setNotice(data.estado === "error" ? "No se pudo procesar." : "Instrucción recibida.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No pudimos conectar con SOMBER AI.");
      setBusy(false);
    }
  }

  function enter(event: React.FormEvent) {
    event.preventDefault();
    if (!email.includes("@") || password.length < 8) {
      setNotice("Usa un correo y una contraseña de al menos 8 caracteres.");
      return;
    }
    setSession(email);
    setNotice("");
    setScreen("Inicio");
  }

  const legal = (
    <div className="legal">
      <h1>{screen === "Términos" ? "Términos de uso" : "Política de privacidad"}</h1>
      <p className="muted">Beta pública · Actualizado noviembre 2026</p>
      {screen === "Términos" ? (
        <>
          <p>SOMBER AI STUDIO es un servicio en fase beta. Al usarlo aceptas que la generación de contenido es experimental y puede fallar o producir resultados inesperados.</p>
          <p>No subas contenido ilegal, que infrinja derechos de terceros o que sea dañino. Tú eres responsable del uso de los resultados.</p>
          <p>Los planes de pago se activarán cuando conectemos Stripe. Hasta entonces no se realiza ningún cobro real.</p>
          <p>Podemos modificar o suspender la beta en cualquier momento.</p>
        </>
      ) : (
        <>
          <p>Guardamos en tu navegador (localStorage / IndexedDB) preferencias, historial local de trabajos y archivos que subas en este dispositivo.</p>
          <p>Las peticiones de generación se envían a nuestro API (Render). No vendemos tus datos. Los logs de servidor pueden incluir IP y texto de prompt por seguridad y depuración.</p>
          <p>Cuando activemos cuentas reales y Supabase, se aplicará una política ampliada y podrás solicitar eliminación de datos.</p>
        </>
      )}
      <button className="btn" onClick={() => setScreen("Inicio")}>Volver</button>
    </div>
  );

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
            <button className={screen === "Soporte" ? "on" : ""} onClick={() => setScreen("Soporte")}>Soporte</button>
          </nav>
          <div className="side-foot">
            <button className="ghost" onClick={() => setScreen("Términos")}>Términos</button>
            <button className="ghost" onClick={() => setScreen("Privacidad")}>Privacidad</button>
          </div>
        </aside>
      ) : null}
      <div className="main">
        {screen !== "Entrar" && screen !== "Términos" && screen !== "Privacidad" ? (
          <header className="top">
            <div className="banner">
              <span className="dot" />
              Beta pública · {apiOk === null ? "comprobando API…" : apiOk ? "API lista" : "API limitada"}
            </div>
            <input placeholder="Buscar proyectos…" onKeyDown={(e) => e.key === "Enter" && setScreen("Proyectos")} />
            <button className="ghost" onClick={() => setScreen(session ? "Cuenta" : "Entrar")}>
              {session ? session.split("@")[0] : "Entrar"}
            </button>
          </header>
        ) : null}
        <section className="view">
          {screen === "Inicio" ? (
            <>
              <p className="muted">Bienvenido a</p>
              <h1>SOMBER AI STUDIO</h1>
              <p className="muted">Convierte tus ideas en videos increíbles con el poder de la IA. Versión beta pública.</p>
              <div className="row">
                <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe el video que quieres crear…" />
                <button className="btn" onClick={() => setScreen("Crear video")}>Generar</button>
              </div>
              <div className="chips">
                <button onClick={() => setScreen("Crear video")}>Videos realistas</button>
                <button onClick={() => setScreen("Anime")}>Estilo anime</button>
                <button onClick={() => setScreen("Editor")}>Edición avanzada</button>
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
              {jobs.length > 0 ? (
                <>
                  <h2>Últimas generaciones</h2>
                  <div className="jobs">
                    {jobs.slice(0, 5).map((j) => (
                      <article key={j.id} className="card">
                        <strong>{j.text}</strong>
                        <small>{j.status}</small>
                        {j.video ? <video className="player" controls src={j.video} /> : null}
                      </article>
                    ))}
                  </div>
                </>
              ) : null}
            </>
          ) : null}

          {screen === "Crear video" || screen === "Anime" ? (
            <div className="split">
              <form
                className="card"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleCreate(screen === "Anime" ? "anime" : "video");
                }}
              >
                <h1>{screen === "Anime" ? "Crea videos de anime con IA" : "Crear un nuevo video"}</h1>
                <p className="muted">Describe tu idea. Formato vertical listo para redes.</p>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ejemplo: Un dragón volando sobre un castillo medieval al atardecer…" />
                <p className="muted">Estilo</p>
                <div className="styles">
                  {(screen === "Anime" ? ANIME_STYLES : STYLES).map(([name, file]) => (
                    <button
                      type="button"
                      key={name}
                      className={look === name ? "style-card on" : "style-card"}
                      onClick={() => {
                        setLook(name);
                        setNotice(`Estilo ${name} seleccionado.`);
                      }}
                    >
                      <img src={`${base}gallery/styles/${file}.jpg`} alt={name} />
                      <span className="style-label">
                        {name}
                        {look === name ? " · elegido" : ""}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="muted">Relación de aspecto</p>
                <div className="chips">
                  {["9:16", "16:9", "1:1"].map((item) => (
                    <button type="button" key={item} className={format === item ? "on" : ""} onClick={() => setFormat(item)}>
                      {item}
                    </button>
                  ))}
                </div>
                <p className="muted">Duración</p>
                <div className="chips">
                  {["5s", "10s"].map((item) => (
                    <button type="button" key={item} className={seconds === item ? "on" : ""} onClick={() => setSeconds(item)}>
                      {item}
                    </button>
                  ))}
                </div>
                <button className="btn wide" disabled={busy}>{busy ? "Generando…" : "Generar video"}</button>
                {notice ? <p className="notice">{notice}</p> : null}
                {result ? (
                  <div className="result">
                    <strong>{result.nombre || "SOMBER AI"}</strong>
                    <p>{result.mensaje || result.estado || "Procesando"}</p>
                    {result.video_url ? <video className="player" controls src={result.video_url} /> : null}
                    {result.pasos?.map((step) => <p key={step}>{step}</p>)}
                  </div>
                ) : null}
              </form>
              <aside className="card tips">
                <h2>Consejos</h2>
                <p>Sé específico en la descripción.</p>
                <p>Indica el estilo y el ambiente.</p>
                <p>Vertical 9:16 para Reels / TikTok / Shorts.</p>
                <p>Máximo {RATE_MAX} generaciones por hora en beta.</p>
              </aside>
            </div>
          ) : null}

          {screen === "Editor" ? (
            <>
              <h1>Editor de video</h1>
              {files.find((f) => f.type.startsWith("video/")) ? (
                <video className="player" controls src={files.find((f) => f.type.startsWith("video/"))?.url} />
              ) : (
                <div className="player">Sube un video en Nube o genera uno para verlo aquí</div>
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
                    <div>
                      <strong>{name}</strong>
                      <small>{ratio}</small>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          {screen === "Nube" ? (
            <>
              <h1>Mi nube (dispositivo)</h1>
              <p className="muted">Los archivos se guardan solo en este navegador (IndexedDB).</p>
              <label className="btn">
                Subir desde el dispositivo
                <input
                  className="sr"
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) saveDeviceFile(file);
                  }}
                />
              </label>
              <div className="grid">
                {files.length === 0 ? <p className="muted">Todavía no hay archivos.</p> : null}
                {files.map((file) => (
                  <article key={file.id} className="tile">
                    {file.type.startsWith("video/") ? <video src={file.url} controls /> : <img src={file.url} alt={file.name} />}
                    <div><strong>{file.name}</strong></div>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          {screen === "Planes" ? (
            <>
              <h1>Elige el plan perfecto para ti</h1>
              <div className="plans">
                {[
                  ["Básico", "$0", "Plan gratuito", "Comenzar"],
                  ["Pro", "$12", "Para creadores en crecimiento", "Mejorar plan"],
                  ["Estudio", "$29", "Para profesionales", "Mejorar plan"],
                ].map(([name, price, text, action]) => (
                  <article key={name} className={name === "Pro" ? "card pop" : "card"}>
                    <h2>{name}</h2>
                    <p className="price">{price}<small>/mes</small></p>
                    <p className="muted">{text}</p>
                    <button className="btn wide" onClick={() => { setPlanElegido(name); setScreen("Pago"); }}>{action}</button>
                  </article>
                ))}
              </div>
              <p className="muted">El cobro real se activará cuando conectemos Stripe. Ahora solo se marca el plan en este navegador.</p>
            </>
          ) : null}

          {screen === "Pago" ? (
            <>
              <h1>Pago y suscripciones</h1>
              <p className="muted">Plan activo en este navegador: <strong>{planActivo}</strong>. Confirmar no cobra una tarjeta.</p>
              <div className="plans">
                {["Básico", "Pro", "Estudio"].map((name) => (
                  <button key={name} className={planElegido === name ? "card pop" : "card"} onClick={() => setPlanElegido(name)}>
                    <h2>{name}</h2>
                  </button>
                ))}
              </div>
              <button
                className="btn"
                onClick={() => {
                  localStorage.setItem("somber-plan-activa", planElegido);
                  setPlanActivo(planElegido);
                  setNotice(`Plan ${planElegido} activo. No se hizo ningún cobro.`);
                }}
              >
                Activar {planElegido}
              </button>
              {notice ? <p className="notice">{notice}</p> : null}
            </>
          ) : null}

          {screen === "Panel" ? (
            <>
              <h1>Panel de control</h1>
              <div className="stats">
                {[
                  ["Videos", String(jobs.filter((j) => j.status === "completed").length)],
                  ["Trabajos", String(jobs.length)],
                  ["Plan", planActivo],
                  ["API", apiOk ? "OK" : "—"],
                ].map(([label, value]) => (
                  <article key={label} className="card"><small>{label}</small><strong>{value}</strong></article>
                ))}
              </div>
            </>
          ) : null}

          {screen === "Cuenta" ? (
            <>
              <h1>Mi cuenta</h1>
              <form className="card narrow" onSubmit={enter}>
                <label>Correo electrónico<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" /></label>
                <p className="muted">{session ? `Sesión de esta página: ${session}` : "Entra para guardar el nombre en este navegador."}</p>
                <button className="btn wide">Guardar cambios</button>
              </form>
              <p className="muted">La cuenta real con créditos y sincronización en la nube se activará con Supabase.</p>
            </>
          ) : null}

          {screen === "Soporte" ? (
            <div className="card narrow">
              <h1>Soporte</h1>
              <p>Beta pública. Si algo no funciona:</p>
              <ul>
                <li>Recarga la página y prueba de nuevo.</li>
                <li>Comprueba que el API está en verde en la barra superior.</li>
                <li>Respeta el límite de generaciones por hora.</li>
              </ul>
              <p className="muted">Contacto: usa el correo de tu cuenta de GitHub o el que configures como soporte oficial.</p>
              <button className="btn" onClick={() => setScreen("Inicio")}>Volver al inicio</button>
            </div>
          ) : null}

          {screen === "Términos" || screen === "Privacidad" ? legal : null}

          {screen === "Entrar" ? (
            <form className="login" onSubmit={enter}>
              <button type="button" className="brand center" onClick={() => setScreen("Inicio")}>
                <span>S</span>
                <strong>SOMBER AI STUDIO<small>Tu imaginación, nuestro poder.</small></strong>
              </button>
              <h1>Iniciar sesión</h1>
              <label>Correo electrónico<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
              <label>Contraseña<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={8} required /></label>
              {notice ? <p className="notice">{notice}</p> : null}
              <button className="btn wide">Iniciar sesión</button>
              <p className="muted">La sesión real con créditos llegará con Supabase. Aquí solo se guarda el nombre en este navegador.</p>
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
        {(
          [
            ["Inicio", "Inicio"],
            ["Crear video", "Crear"],
            ["Anime", "Anime"],
            ["Nube", "Nube"],
            ["Pago", "Pago"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className={screen === id ? "on" : ""} onClick={() => setScreen(id)}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
