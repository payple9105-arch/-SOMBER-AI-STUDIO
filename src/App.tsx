import { useEffect, useRef, useState } from "react";
import {
  supabase, supabaseConfigured, fetchProfile, spendCredits, refundCredits,
  insertJob, updateJob, listMyJobs, type Profile, type JobRow,
} from "./lib/supabase";

type ApiResult = { estado?: string; mensaje?: string; request_id?: string; status_url?: string; video_url?: string };

const API_URL = "https://somber-ai-studio-api.onrender.com";
const CREDIT_COST = 1;
const RATE_KEY = "somber-gen-ts";
const RATE_MAX = 20;
const RATE_WINDOW = 60 * 60 * 1000;

const NAV = [
  ["Inicio", "Inicio"],
  ["Crear video", "Crear Video con IA"],
  ["Imagen a Video", "Imagen a Video"],
  ["Anime", "Anime Studio"],
  ["Editor", "Editor Profesional"],
  ["Voces", "Voces y Música"],
  ["Proyectos", "Mis Proyectos"],
  ["Nube", "Nube"],
  ["Planes", "Planes y Créditos"],
  ["Cuenta", "Cuenta"],
] as const;

type Screen = (typeof NAV)[number][0] | "Entrar" | "Soporte" | "Términos" | "Privacidad" | "Pago";

const base = import.meta.env.BASE_URL;
const COVERS = [`${base}gallery/hero.jpg`, `${base}gallery/neon.jpg`, `${base}gallery/mesa.jpg`, `${base}gallery/portrait.jpg`];
const STYLES = [["Cinemático","cinematico"],["Anime","anime"],["Cyberpunk","cyberpunk"],["Documental","documental"],["Noir","noir"]] as const;
const ANIME_STYLES = [["Shonen épico","shonen"],["Ghibli suave","ghibli"],["Noir urbano","noir"],["Mecha nocturno","mecha"],["Romance pastel","romance"]] as const;
const TOOLS = [
  ["Crear Video con IA", "Crear video", "🎬"],
  ["Imagen a Video", "Imagen a Video", "🖼️"],
  ["Anime Studio", "Anime", "🎌"],
  ["Editor Profesional", "Editor", "🎞️"],
  ["Voces y Música", "Voces", "🎵"],
] as const;

function canGenerateLocal() {
  try {
    const list: number[] = JSON.parse(localStorage.getItem(RATE_KEY) || "[]");
    return list.filter((t) => Date.now() - t < RATE_WINDOW).length < RATE_MAX;
  } catch { return true; }
}
function markGenerateLocal() {
  try {
    const list: number[] = JSON.parse(localStorage.getItem(RATE_KEY) || "[]");
    const now = Date.now();
    localStorage.setItem(RATE_KEY, JSON.stringify([...list.filter((t) => now - t < RATE_WINDOW), now]));
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
  const [voice, setVoice] = useState("Femenina");

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
    fetch(`${API_URL}/health`).then((r) => r.json()).then((d) => setApiOk(!!d?.fal_configurado || d?.estado === "activo")).catch(() => setApiOk(false));
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
      } catch (e) { console.error(e); }
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const user = session?.user;
      if (!user) { setSessionEmail(""); setProfile(null); setJobs([]); return; }
      setSessionEmail(user.email || "");
      try {
        const p = await fetchProfile(user.id);
        setProfile(p);
        if (p?.plan) setPlanActivo(p.plan);
        setJobs(await listMyJobs(20));
      } catch (e) { console.error(e); }
    });
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      sub.subscription.unsubscribe();
    };
  }, []);

  function saveDeviceFile(file: File) {
    if (file.size > 18 * 1024 * 1024) { setNotice("Archivo demasiado grande (máx. 18 MB)."); return; }
    const id = crypto.randomUUID();
    const request = indexedDB.open("somber-studio", 1);
    request.onsuccess = () => {
      const tx = request.result.transaction("files", "readwrite");
      tx.objectStore("files").put({ id, name: file.name, type: file.type, blob: file });
      tx.oncomplete = () => setFiles((c) => [{ id, name: file.name, type: file.type, url: URL.createObjectURL(file) }, ...c]);
    };
  }

  async function pollJob(requestId: string, jobDbId?: string, statusUrl?: string) {
    try {
      const r = await fetch(statusUrl || `${API_URL}/generate/${requestId}`);
      if (!r.ok) return;
      const data = await r.json();
      const status = (data.status || data.estado || "").toLowerCase();
      const video = data.video_url || data.video || data.output?.video?.url || data.response?.video?.url;
      if (status === "completed" || status === "ok" || video) {
        setApiResult((prev) => ({ ...(prev || {}), estado: "completed", video_url: video, mensaje: "Listo" }));
        if (jobDbId && supabaseConfigured) {
          try { await updateJob(jobDbId, { status: "completed", video_url: video || null }); setJobs(await listMyJobs(20)); } catch {}
        }
        if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
        setBusy(false);
        setNotice(video ? "Video listo." : "Generación completada.");
      } else if (status === "failed" || status === "error") {
        setApiResult((prev) => ({ ...(prev || {}), estado: "error", mensaje: data.detail || data.mensaje || "Falló" }));
        if (jobDbId && supabaseConfigured) {
          try {
            await updateJob(jobDbId, { status: "error", error_message: String(data.detail || data.mensaje || "error") });
            if (profile && !profile.is_creator) { const p = await refundCredits(CREDIT_COST, "refund_failed_job"); setProfile(p); }
            setJobs(await listMyJobs(20));
          } catch {}
        }
        if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
        setBusy(false);
        setNotice("La generación falló. Intenta de nuevo.");
      }
    } catch {}
  }

  async function handleCreate(kind: "video" | "anime") {
    if (prompt.trim().length < 8) { setNotice("Escribe una descripción un poco más larga."); return; }
    if (!canGenerateLocal()) { setNotice(`Límite de ${RATE_MAX} generaciones por hora.`); return; }
    if (supabaseConfigured && !sessionEmail) { setNotice("Entra con tu cuenta para generar."); setScreen("Entrar"); return; }
    setNotice(""); setApiResult(null); setBusy(true);
    const text = [prompt.trim(), `Estilo: ${look}.`, `Formato: ${format}.`, `Duración: ${seconds}.`].join("\n");
    let jobDbId: string | undefined;
    try {
      if (supabaseConfigured && sessionEmail) {
        try {
          const p = await spendCredits(CREDIT_COST, kind === "anime" ? "generate_anime" : "generate_video");
          setProfile(p);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          setBusy(false);
          setNotice(msg.includes("insuficientes") ? "No te quedan créditos." : msg);
          return;
        }
      }
      const response = await fetch(`${API_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, aspect: format, duration_sec: parseInt(seconds, 10) || 5 }),
      });
      if (response.status === 429) { setNotice("Límite del servidor."); setBusy(false); return; }
      if (!response.ok) throw new Error(`El servidor respondió ${response.status}.`);
      const data = (await response.json()) as ApiResult;
      setApiResult(data);
      markGenerateLocal();
      if (supabaseConfigured && sessionEmail) {
        try {
          const row = await insertJob({
            prompt: prompt.trim(), style: look, aspect: format,
            duration_sec: parseInt(seconds, 10) || 5,
            provider_request_id: data.request_id, status: data.estado || "queued",
          });
          jobDbId = row.id;
          setJobs(await listMyJobs(20));
        } catch (e) { console.error(e); }
      }
      const rid = data.request_id || String(Date.now());
      if (data.request_id || data.status_url) {
        setNotice("Generando… 1–2 minutos.");
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = window.setInterval(() => void pollJob(rid, jobDbId, data.status_url), 4000);
        void pollJob(rid, jobDbId, data.status_url);
      } else {
        setBusy(false);
        setNotice(data.estado === "error" ? "No se pudo procesar." : "Instrucción recibida.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No pudimos conectar.");
      setBusy(false);
    }
  }

  async function handleAuth(event: React.FormEvent) {
    event.preventDefault();
    if (!email.includes("@") || password.length < 8) { setNotice("Correo y contraseña de al menos 8 caracteres."); return; }
    if (!supabase) { setSessionEmail(email); setNotice("Sesión local."); setScreen("Inicio"); return; }
    setBusy(true); setNotice("");
    try {
      if (modeAuth === "register") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          setSessionEmail(data.user.email || email);
          try { setProfile(await fetchProfile(data.user.id)); } catch {}
          setNotice("Cuenta creada.");
          setScreen("Inicio");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setSessionEmail(data.user?.email || email);
        if (data.user) {
          setProfile(await fetchProfile(data.user.id));
          setJobs(await listMyJobs(20));
        }
        setScreen("Inicio");
      }
    } catch (e: unknown) {
      setNotice(e instanceof Error ? e.message : "No se pudo autenticar.");
    } finally { setBusy(false); }
  }

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    setSessionEmail(""); setProfile(null); setJobs([]); setScreen("Inicio");
  }

  const creditsLabel = profile ? (profile.is_creator ? "∞" : String(profile.credits)) : sessionEmail ? "…" : "—";
  const displayName = sessionEmail ? sessionEmail.split("@")[0] : "Invitado";

  if (screen === "Entrar") {
    return (
      <div className="app center-screen">
        <form className="login" onSubmit={(e) => void handleAuth(e)}>
          <div className="brand-row"><span className="logo-mark">S</span><strong>SOMBER AI STUDIO</strong></div>
          <h1>{modeAuth === "login" ? "Iniciar sesión" : "Crear cuenta"}</h1>
          <label>Correo<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
          <label>Contraseña<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={8} required /></label>
          {notice ? <p className="notice">{notice}</p> : null}
          <button className="btn wide" disabled={busy}>{busy ? "Espera…" : modeAuth === "login" ? "Entrar" : "Registrarme"}</button>
          <button type="button" className="link" onClick={() => setModeAuth((m) => (m === "login" ? "register" : "login"))}>
            {modeAuth === "login" ? "¿No tienes cuenta? Regístrate" : "Ya tengo cuenta"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="side">
        <button className="brand" onClick={() => setScreen("Inicio")}>
          <span className="logo-mark">S</span>
          <strong>SOMBER AI<small>STUDIO</small></strong>
        </button>
        <nav>
          {NAV.map(([id, label]) => (
            <button key={id} className={screen === id || (id === "Planes" && screen === "Pago") ? "on" : ""} onClick={() => setScreen(id)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="side-user">
          <div className="avatar">{displayName.slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{displayName}</strong>
            <small>{profile?.plan || planActivo} · {creditsLabel} créd.</small>
          </div>
        </div>
        <button className="btn side-cta" onClick={() => setScreen(sessionEmail ? "Planes" : "Entrar")}>
          {sessionEmail ? "Actualizar Plan" : "Entrar"}
        </button>
      </aside>

      <div className="main">
        <header className="top">
          <input className="search" placeholder="Buscar herramientas…" />
          <div className="top-right">
            <span className="pill">{apiOk ? "API lista" : "API…"} · Supabase · {creditsLabel}</span>
            <button className="ghost" onClick={() => setScreen(sessionEmail ? "Cuenta" : "Entrar")}>
              {sessionEmail ? displayName : "Entrar"}
            </button>
          </div>
        </header>

        <section className="view">
          {screen === "Inicio" ? (
            <div className="home">
              <div className="hero">
                <div className="hero-copy">
                  <h1>SOMBER AI STUDIO</h1>
                  <p>Crea, edita y da vida a tus ideas con el poder de la IA</p>
                  <button className="btn lg" onClick={() => setScreen("Crear video")}>Crear Proyecto →</button>
                </div>
                <div className="hero-art">
                  <img src={COVERS[3]} alt="" />
                </div>
              </div>
              <h2>Herramientas Destacadas</h2>
              <div className="tools">
                {TOOLS.map(([title, target, icon]) => (
                  <button key={title} className="tool-card" onClick={() => setScreen(target as Screen)}>
                    <span className="tool-ico">{icon}</span>
                    <strong>{title}</strong>
                  </button>
                ))}
              </div>
              {jobs.length > 0 ? (
                <>
                  <h2>Proyectos recientes</h2>
                  <div className="grid4">
                    {jobs.slice(0, 4).map((j) => (
                      <article key={j.id} className="card">
                        {j.video_url ? <video src={j.video_url} muted /> : <div className="thumb" />}
                        <div><strong>{j.prompt.slice(0, 40)}</strong><small>{j.status}</small></div>
                      </article>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {screen === "Crear video" || screen === "Anime" ? (
            <div className="create-layout">
              <div className="create-form card">
                <h1>{screen === "Anime" ? "Anime Studio" : "Crear Video con IA"}</h1>
                <p className="muted">{screen === "Anime" ? "Crea personajes, escenas y animaciones" : "Describe tu idea y deja que la IA la haga realidad"}</p>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ejemplo: Un astronauta en la luna, estilo cinematográfico…" maxLength={2000} />
                <div className="char-count">{prompt.length}/2000</div>
                <p className="label">Estilo</p>
                <div className="styles">
                  {(screen === "Anime" ? ANIME_STYLES : STYLES).map(([name, file]) => (
                    <button key={name} type="button" className={look === name ? "style-card on" : "style-card"} onClick={() => setLook(name)}>
                      <img src={`${base}gallery/${file}.jpg`} alt="" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                      <span>{name}</span>
                    </button>
                  ))}
                </div>
                <div className="row3">
                  <div>
                    <p className="label">Duración</p>
                    <div className="chips">{["5s", "10s"].map((s) => (
                      <button key={s} type="button" className={seconds === s ? "on" : ""} onClick={() => setSeconds(s)}>{s}</button>
                    ))}</div>
                  </div>
                  <div>
                    <p className="label">Formato</p>
                    <div className="chips">{["9:16", "16:9", "1:1"].map((f) => (
                      <button key={f} type="button" className={format === f ? "on" : ""} onClick={() => setFormat(f)}>{f}</button>
                    ))}</div>
                  </div>
                </div>
                <button className="btn wide lg" disabled={busy} onClick={() => void handleCreate(screen === "Anime" ? "anime" : "video")}>
                  {busy ? "Generando…" : screen === "Anime" ? "Generar Anime →" : "Generar Video →"}
                </button>
                {notice ? <p className="notice">{notice}</p> : null}
              </div>
              <div className="preview-pane card">
                <p className="label">Vista Previa</p>
                {result?.video_url ? (
                  <video className="preview" controls src={result.video_url} />
                ) : (
                  <div className="preview empty">Tu video aparecerá aquí</div>
                )}
              </div>
            </div>
          ) : null}

          {screen === "Imagen a Video" ? (
            <div className="create-layout">
              <div className="card">
                <h1>Imagen a Video</h1>
                <p className="muted">Convierte tus imágenes en videos increíbles</p>
                <label className="dropzone">
                  <span>☁ Arrastra tu imagen aquí o selecciona un archivo</span>
                  <small>JPG, PNG, WEBP</small>
                  <input hidden type="file" accept="image/*" onChange={(e) => {
                    const f = e.target.files?.[0]; e.target.value = "";
                    if (f) saveDeviceFile(f);
                  }} />
                </label>
                <div className="row3">
                  <div>
                    <p className="label">Duración</p>
                    <div className="chips">{["5s","10s"].map((s)=>(
                      <button key={s} type="button" className={seconds===s?"on":""} onClick={()=>setSeconds(s)}>{s}</button>
                    ))}</div>
                  </div>
                  <div>
                    <p className="label">Estilo</p>
                    <div className="chips">{["Cine","Anime","Digital"].map((s)=>(
                      <button key={s} type="button" className={look===s?"on":""} onClick={()=>setLook(s)}>{s}</button>
                    ))}</div>
                  </div>
                </div>
                <button className="btn wide lg" onClick={() => setScreen("Crear video")}>Crear Video →</button>
              </div>
              <div className="preview-pane card">
                <p className="label">Imagen seleccionada</p>
                {files.find((f)=>f.type.startsWith("image/")) ? (
                  <img className="preview" src={files.find((f)=>f.type.startsWith("image/"))!.url} alt="" />
                ) : (
                  <div className="preview empty">Sin imagen</div>
                )}
              </div>
            </div>
          ) : null}

          {screen === "Editor" ? (
            <div className="editor">
              <div className="editor-top">
                <strong>Editor Profesional</strong>
                <div className="editor-actions">
                  <button className="ghost">Guardar</button>
                  <button className="btn">Exportar</button>
                </div>
              </div>
              <div className="editor-body">
                <div className="editor-lib">
                  <p className="label">Archivos</p>
                  <label className="btn tiny">Importar
                    <input hidden type="file" accept="video/*,image/*,audio/*" onChange={(e)=>{const f=e.target.files?.[0];e.target.value="";if(f)saveDeviceFile(f);}} />
                  </label>
                  <div className="lib-list">
                    {files.map((f)=>(
                      <button key={f.id} type="button" className="lib-item">{f.name}</button>
                    ))}
                    {files.length===0 ? <p className="muted">Sin archivos</p> : null}
                  </div>
                </div>
                <div className="editor-stage">
                  {files.find((f)=>f.type.startsWith("video/")) || result?.video_url ? (
                    <video className="preview" controls src={result?.video_url || files.find((f)=>f.type.startsWith("video/"))?.url} />
                  ) : (
                    <div className="preview empty">Vista previa</div>
                  )}
                  <div className="timeline">
                    <div className="track"><span>V1</span><i className="clip v" /></div>
                    <div className="track"><span>A1</span><i className="clip a" /></div>
                    <div className="track"><span>T1</span><i className="clip t" /></div>
                  </div>
                </div>
                <div className="editor-props">
                  <p className="label">Ajustes</p>
                  <label>Brillo<input type="range" defaultValue={50} /></label>
                  <label>Contraste<input type="range" defaultValue={50} /></label>
                  <label>Saturación<input type="range" defaultValue={50} /></label>
                  <p className="label">Efectos</p>
                  <div className="chips">{["Glow","Glitch","Blur","Neon"].map((x)=>(
                      <button key={x} type="button">{x}</button>
                    ))}</div>
                </div>
              </div>
            </div>
          ) : null}

          {screen === "Voces" ? (
            <div className="card narrow-card">
              <h1>Voces y Música</h1>
              <p className="muted">Dale voz a tus videos con IA</p>
              <p className="label">Voces IA</p>
              <div className="voice-grid">
                {["Masculina","Femenina","Clonada","Robot"].map((v)=>(
                  <button key={v} type="button" className={voice===v?"voice on":"voice"} onClick={()=>setVoice(v)}>
                    <span>🎙</span>{v}
                  </button>
                ))}
              </div>
              <p className="label">Música</p>
              <div className="chips">{["Épica","Chill","Cyber","Ambient"].map((m)=>(
                  <button key={m} type="button">{m}</button>
                ))}</div>
              <button className="btn wide">Aplicar Voz →</button>
            </div>
          ) : null}

          {screen === "Proyectos" ? (
            <>
              <div className="row-between">
                <h1>Mis Proyectos</h1>
                <button className="btn" onClick={() => setScreen("Crear video")}>+ Nuevo Proyecto</button>
              </div>
              <div className="grid4">
                {(jobs.length ? jobs.map((j)=>({id:j.id,title:j.prompt.slice(0,32),sub:j.status,src:j.video_url||""})) : [
                  {id:"1",title:"Mi primer video",sub:"Plantilla",src:COVERS[0]},
                  {id:"2",title:"Anime Hero",sub:"Plantilla",src:COVERS[3]},
                  {id:"3",title:"Paisaje épico",sub:"Plantilla",src:COVERS[1]},
                  {id:"4",title:"Trailer IA",sub:"Plantilla",src:COVERS[2]},
                ]).map((p)=>(
                  <article key={p.id} className="card project">
                    {p.src && p.src.endsWith(".jpg") ? <img src={p.src} alt="" /> : p.src ? <video src={p.src} muted /> : <div className="thumb" />}
                    <div><strong>{p.title}</strong><small>{p.sub}</small></div>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          {screen === "Nube" ? (
            <div className="card center-card">
              <h1>Nube</h1>
              <p className="muted">Guarda tus proyectos y accede desde cualquier lugar</p>
              <div className="cloud-ico">☁</div>
              <label className="btn lg">
                Subir a la Nube
                <input hidden type="file" accept="video/*,image/*,audio/*" onChange={(e)=>{const f=e.target.files?.[0];e.target.value="";if(f)saveDeviceFile(f);}} />
              </label>
              <p className="muted">Por ahora se guarda en este dispositivo. Supabase Storage próximamente.</p>
              <div className="grid4" style={{marginTop:16}}>
                {files.map((f)=>(
                  <article key={f.id} className="card"><strong>{f.name}</strong><small>{f.type}</small></article>
                ))}
              </div>
            </div>
          ) : null}

          {screen === "Planes" || screen === "Pago" ? (
            <>
              <h1>Planes y Créditos</h1>
              <p className="muted">Elige tu plan y sigue creando sin límites</p>
              <div className="plans">
                {[
                  ["Basico","$4.99","100 créditos","Acceso básico","Soporte por email"],
                  ["Pro","$9.99","500 créditos","Todas las funciones","Soporte prioritario"],
                  ["Ultra","$19.99","1,000 créditos","Funciones premium","Soporte 24/7"],
                ].map(([name, price, a, b, c]) => (
                  <article key={name} className={name === "Pro" ? "card plan pop" : "card plan"}>
                    {name === "Pro" ? <span className="badge">Más Popular</span> : null}
                    <h2>{name}</h2>
                    <p className="price">{price}<small>/mes</small></p>
                    <ul>
                      <li>{a}</li><li>{b}</li><li>{c}</li>
                    </ul>
                    <button className="btn wide" onClick={() => {
                      setPlanElegido(name);
                      localStorage.setItem("somber-plan-activa", name);
                      setPlanActivo(name);
                      setNotice(`Plan ${name} marcado (Stripe pendiente).`);
                    }}>Seleccionar</button>
                  </article>
                ))}
              </div>
              {notice ? <p className="notice">{notice}</p> : null}
            </>
          ) : null}

          {screen === "Cuenta" ? (
            <div className="card narrow-card">
              <h1>Mi Cuenta</h1>
              <div className="profile-row">
                <div className="avatar lg">{displayName.slice(0,1).toUpperCase()}</div>
                <div>
                  <strong>{displayName}</strong>
                  <p className="muted">{sessionEmail || "Sin sesión"}</p>
                  <span className="pill">{profile?.plan || planActivo}</span>
                </div>
              </div>
              <div className="stats3">
                <div><small>Proyectos</small><strong>{jobs.length}</strong></div>
                <div><small>Videos</small><strong>{jobs.filter((j)=>j.status==="completed").length}</strong></div>
                <div><small>Créditos</small><strong>{creditsLabel}</strong></div>
              </div>
              {sessionEmail ? (
                <button className="btn wide" onClick={() => void handleLogout()}>Cerrar sesión</button>
              ) : (
                <button className="btn wide" onClick={() => setScreen("Entrar")}>Iniciar sesión</button>
              )}
              <div className="links">
                <button className="link" onClick={() => setScreen("Términos")}>Términos</button>
                <button className="link" onClick={() => setScreen("Privacidad")}>Privacidad</button>
                <button className="link" onClick={() => setScreen("Soporte")}>Soporte</button>
              </div>
            </div>
          ) : null}

          {screen === "Soporte" ? (
            <div className="card narrow-card">
              <h1>Soporte</h1>
              <p className="muted">Escribe a payple9105@gmail.com</p>
              <button className="btn" onClick={() => setScreen("Inicio")}>Volver</button>
            </div>
          ) : null}

          {screen === "Términos" || screen === "Privacidad" ? (
            <div className="card narrow-card">
              <h1>{screen === "Términos" ? "Términos de uso" : "Privacidad"}</h1>
              <p className="muted">Beta pública · Noviembre 2026</p>
              <p>{screen === "Términos" ? "SOMBER AI STUDIO es un servicio en fase beta." : "Guardamos correo, plan y créditos en Supabase."}</p>
              <button className="btn" onClick={() => setScreen("Inicio")}>Volver</button>
            </div>
          ) : null}
        </section>
      </div>

      <nav className="mobile">
        {([["Inicio","Inicio"],["Crear video","Crear"],["Anime","Anime"],["Proyectos","Proyectos"],["Cuenta","Cuenta"]] as const).map(([id,label])=>(
          <button key={id} className={screen===id?"on":""} onClick={()=>setScreen(id)}>{label}</button>
        ))}
      </nav>
    </div>
  );
}
