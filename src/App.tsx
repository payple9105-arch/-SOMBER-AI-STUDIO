import { useEffect, useState } from "react";

type ApiResult = {
  nombre?: string;
  etapa?: number;
  estado?: string;
  instruccion?: Record<string, unknown>;
  pasos?: string[];
  avisos?: string[];
  entorno?: Record<string, unknown>;
  resultado?: unknown;
};

const API_URL = "https://somber-ai-studio-api.onrender.com";
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
] as const;

type Screen = (typeof SCREENS)[number] | "Entrar";

const base = import.meta.env.BASE_URL;
const COVERS = [`${base}gallery/hero.jpg`, `${base}gallery/neon.jpg`, `${base}gallery/mesa.jpg`, `${base}gallery/portrait.jpg`];
const PROJECTS = [
  ["Batalla épica", "16:9", COVERS[0]],
  ["Paisaje futurista", "16:9", COVERS[1]],
  ["Anime · Guerrero", "1:1", COVERS[3]],
  ["Ciudad nocturna", "9:16", COVERS[2]],
] as const;

export default function App() {
  const [screen, setScreen] = useState<Screen>("Inicio");
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState("16:9");
  const [seconds, setSeconds] = useState("5s");
  const [look, setLook] = useState("Acción");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setApiResult] = useState<ApiResult | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState("");
  const [files, setFiles] = useState<{ id: string; name: string; type: string; url: string }[]>([]);
  const [planActivo, setPlanActivo] = useState("Básico");
  const [planElegido, setPlanElegido] = useState("Pro");

  useEffect(() => {
    setPlanActivo(localStorage.getItem("somber-plan-activa") || "Básico");
    const request = indexedDB.open("somber-studio", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files", { keyPath: "id" });
    request.onsuccess = () => {
      const read = request.result.transaction("files").objectStore("files").getAll();
      read.onsuccess = () => {
        const rows = read.result as { id: string; name: string; type: string; blob: Blob }[];
        setFiles(rows.map((row) => ({ id: row.id, name: row.name, type: row.type, url: URL.createObjectURL(row.blob) })));
      };
    };
  }, []);

  function saveDeviceFile(file: File) {
    const id = crypto.randomUUID();
    const request = indexedDB.open("somber-studio", 1);
    request.onsuccess = () => {
      const tx = request.result.transaction("files", "readwrite");
      tx.objectStore("files").put({ id, name: file.name, type: file.type, blob: file });
      tx.oncomplete = () => setFiles((current) => [{ id, name: file.name, type: file.type, url: URL.createObjectURL(file) }, ...current]);
    };
  }

  async function handleCreate(kind: "video" | "anime") {
    if (prompt.trim().length < 8) {
      setNotice("Escribe una descripción un poco más larga.");
      return;
    }
    setNotice("");
    setApiResult(null);
    setBusy(true);
    const text = [prompt.trim(), `Formato: ${format}.`, `Duración: ${seconds}.`, kind === "anime" ? `Estilo anime: ${look}.` : ""]
      .filter(Boolean)
      .join("\n");
    try {
      const response = await fetch(`${API_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, aspect: format }),
      });
      if (!response.ok) throw new Error(`El servidor respondió ${response.status}.`);
      const data = (await response.json()) as ApiResult;
      setApiResult(data);
      setNotice(data.estado === "error" ? "SOMBER AI recibió la idea, pero no pudo procesarla." : "Instrucción recibida.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No pudimos conectar con SOMBER AI.");
    } finally {
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

  return (
    <div className="app">
      {screen !== "Entrar" ? (
        <aside className="side">
          <button className="brand" onClick={() => setScreen("Inicio")}>
            <span>S</span>
            <strong>
              SOMBER AI
              <small>STUDIO</small>
            </strong>
          </button>
          <nav>
            {SCREENS.map((item) => (
              <button key={item} className={screen === item ? "on" : ""} onClick={() => setScreen(item)}>
                {item === "Panel" ? "Panel de control" : item === "Cuenta" ? "Configuración" : item}
              </button>
            ))}
          </nav>
        </aside>
      ) : null}
      <div className="main">
        {screen !== "Entrar" ? (
          <header className="top">
            <input placeholder="Buscar proyectos…" onKeyDown={(event) => event.key === "Enter" && setScreen("Proyectos")} />
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
              <p className="muted">Convierte tus ideas en videos increíbles con el poder de la IA.</p>
              <div className="row">
                <input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe el video que quieres crear…" />
                <button className="btn" onClick={() => setScreen("Crear video")}>Generar</button>
              </div>
              <div className="chips">
                <button onClick={() => setScreen("Crear video")}>Videos realistas</button>
                <button onClick={() => setScreen("Anime")}>Estilo anime</button>
                <button onClick={() => setScreen("Editor")}>Edición avanzada</button>
                <button onClick={() => setScreen("Nube")}>Audio y música</button>
              </div>
              <h2>Proyectos recientes</h2>
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

          {screen === "Crear video" || screen === "Anime" ? (
            <div className="split">
              <form
                className="card"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleCreate(screen === "Anime" ? "anime" : "video");
                }}
              >
                <h1>{screen === "Anime" ? "Crea videos de anime con IA" : "Crear un nuevo video"}</h1>
                <p className="muted">Describe tu idea y deja que la IA la haga realidad.</p>
                <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ejemplo: Un dragón volando sobre un castillo medieval al atardecer…" />
                {screen === "Anime" ? (
                  <div className="chips">
                    {["Acción", "Romance", "Ciencia ficción", "Fantasía"].map((item) => (
                      <button type="button" key={item} className={look === item ? "on" : ""} onClick={() => setLook(item)}>
                        {item}
                      </button>
                    ))}
                  </div>
                ) : null}
                <p className="muted">Relación de aspecto</p>
                <div className="chips">
                  {["16:9", "9:16", "1:1"].map((item) => (
                    <button type="button" key={item} className={format === item ? "on" : ""} onClick={() => setFormat(item)}>
                      {item}
                    </button>
                  ))}
                </div>
                <p className="muted">Duración</p>
                <div className="chips">
                  {["5s", "10s", "20s"].map((item) => (
                    <button type="button" key={item} className={seconds === item ? "on" : ""} onClick={() => setSeconds(item)}>
                      {item}
                    </button>
                  ))}
                </div>
                <button className="btn wide" disabled={busy}>{busy ? "Conectando…" : "Generar"}</button>
                {notice ? <p className="notice">{notice}</p> : null}
                {result ? (
                  <div className="result">
                    <strong>{result.nombre || "SOMBER AI"}</strong>
                    <p>Etapa {result.etapa ?? 1}. {result.estado || "Procesado"}.</p>
                    {result.pasos?.map((step) => <p key={step}>{step}</p>)}
                    {typeof result.entorno?.motivo === "string" ? <p>{result.entorno.motivo}</p> : null}
                  </div>
                ) : null}
              </form>
              <aside className="card tips">
                <h2>Consejos</h2>
                <p>Sé específico en la descripción.</p>
                <p>Indica el estilo: anime, realista o cine.</p>
                <p>Puedes añadir referencias.</p>
                <p>Cuanto más detalle, mejor resultado.</p>
              </aside>
            </div>
          ) : null}

          {screen === "Editor" ? (
            <>
              <h1>Editor de video</h1>
              {files.find((file) => file.type.startsWith("video/")) ? (
                <video className="player" controls src={files.find((file) => file.type.startsWith("video/"))?.url} />
              ) : (
                <div className="player">Sube un video en Nube para verlo aquí</div>
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
              <h1>Mi nube</h1>
              <label className="btn">
                Subir desde el dispositivo
                <input
                  className="sr"
                  type="file"
                  accept="image/*,video/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) saveDeviceFile(file);
                  }}
                />
              </label>
              <div className="grid">
                {files.length === 0 ? <p className="muted">Todavía no hay archivos de tu dispositivo.</p> : null}
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
              <p className="muted">El cobro automático todavía no está conectado.</p>
            </>
          ) : null}

          {screen === "Pago" ? (
            <>
              <h1>Pago y suscripciones</h1>
              <p className="muted">Plan activo en este navegador: {planActivo}. Confirmar no cobra una tarjeta.</p>
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
                {[["Videos", "0"], ["Tiempo", "—"], ["Créditos", session ? "Cuenta" : "0"], ["Proyectos", "4"]].map(([label, value]) => (
                  <article key={label} className="card"><small>{label}</small><strong>{value}</strong></article>
                ))}
              </div>
            </>
          ) : null}

          {screen === "Cuenta" ? (
            <>
              <h1>Mi cuenta</h1>
              <form className="card narrow" onSubmit={enter}>
                <label>Correo electrónico<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" /></label>
                <p className="muted">{session ? `Sesión de esta página: ${session}` : "Entra para guardar el nombre en este navegador."}</p>
                <button className="btn wide">Guardar cambios</button>
              </form>
            </>
          ) : null}

          {screen === "Entrar" ? (
            <form className="login" onSubmit={enter}>
              <button type="button" className="brand center" onClick={() => setScreen("Inicio")}>
                <span>S</span>
                <strong>SOMBER AI STUDIO<small>Tu imaginación, nuestro poder.</small></strong>
              </button>
              <h1>Iniciar sesión</h1>
              <label>Correo electrónico<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required /></label>
              <label>Contraseña<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={8} required /></label>
              {notice ? <p className="notice">{notice}</p> : null}
              <button className="btn wide">Iniciar sesión</button>
              <p className="muted">La cuenta real, con créditos y generación, vive en el estudio. Aquí la sesión solo abre esta vista.</p>
            </form>
          ) : null}
        </section>
      </div>
      <nav className="mobile">
        {["Inicio", "Crear video", "Anime", "Proyectos", "Entrar"].map((item) => (
          <button key={item} className={screen === item ? "on" : ""} onClick={() => setScreen(item as Screen)}>
            {item === "Crear video" ? "Crear" : item}
          </button>
        ))}
      </nav>
    </div>
  );
}
