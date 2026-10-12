import { useState } from "react";

type ApiResult = {
  nombre?: string;
  etapa?: number;
  estado?: string;
  instruccion?: Record<string, unknown>;
  pasos?: string[];
  resultado?: unknown;
  avisos?: string[];
  entorno?: Record<string, unknown>;
};

const API_URL = "https://somber-ai-studio-api.onrender.com";

const sections = [
  "Inicio",
  "Crear video",
  "Anime",
  "Proyectos",
  "Editor",
  "Planes",
];

export default function App() {
  const [activeSection, setActiveSection] = useState("Inicio");
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState("16:9");
  const [notice, setNotice] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiResult, setApiResult] = useState<ApiResult | null>(null);

  async function handleCreate() {
    if (!prompt.trim()) {
      setNotice("Escribe una descripción para comenzar.");
      setApiResult(null);
      return;
    }

    setNotice("");
    setApiResult(null);
    setIsGenerating(true);

    const text = [
      prompt.trim(),
      `Formato solicitado: ${format}.`,
      activeSection === "Anime"
        ? "Estilo solicitado: anime."
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const response = await fetch(`${API_URL}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(
          `El servidor respondió con el código ${response.status}.`
        );
      }

      const data = (await response.json()) as ApiResult;

      setApiResult(data);

      if (data.estado === "error") {
        setNotice(
          "SOMBER AI recibió la solicitud, pero no pudo procesarla."
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error desconocido.";

      setNotice(
        `No pudimos conectar con SOMBER AI. ${message} Comprueba tu conexión e inténtalo de nuevo.`
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function openCreator(section: string) {
    setActiveSection(section);
    setNotice("");
    setApiResult(null);
  }

  return (
    <main className="app">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => openCreator("Inicio")}
          aria-label="Ir al inicio"
        >
          <span className="brand-mark">S</span>

          <span>
            <strong>SOMBER</strong>
            <small>AI STUDIO</small>
          </span>
        </button>

        <span className="status">
          <span className="status-dot" />
          Estudio creativo
        </span>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <p className="nav-label">WORKSPACE</p>

          {sections.map((section) => (
            <button
              key={section}
              className={`nav-item ${
                activeSection === section ? "active" : ""
              }`}
              onClick={() => openCreator(section)}
            >
              <span className="nav-symbol">
                {section === "Inicio"
                  ? "⌂"
                  : section === "Crear video"
                    ? "✦"
                    : section === "Anime"
                      ? "◈"
                      : section === "Proyectos"
                        ? "▤"
                        : section === "Editor"
                          ? "▣"
                          : "◇"}
              </span>

              {section}
            </button>
          ))}

          <div className="sidebar-note">
            <span className="note-icon">✧</span>

            <strong>Tu imaginación.</strong>

            <p>
              Las herramientas creativas, en un solo lugar.
            </p>
          </div>
        </aside>

        <section className="content">
          <div className="eyebrow">
            SOMBER AI STUDIO <span>/</span>{" "}
            {activeSection.toUpperCase()}
          </div>

          {activeSection === "Inicio" ? (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <div className="tag">
                    <span>✦</span> TU ESTUDIO CREATIVO CON IA
                  </div>

                  <h1>
                    Convierte tus ideas
                    <br />
                    en algo <span>extraordinario.</span>
                  </h1>

                  <p>
                    Crea videos, genera imágenes y transforma tus
                    historias en experiencias visuales con SOMBER AI
                    STUDIO.
                  </p>

                  <button
                    className="primary-button"
                    onClick={() => openCreator("Crear video")}
                  >
                    Empezar a crear <span>↗</span>
                  </button>
                </div>

                <div className="hero-art">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />

                  <div className="art-core">
                    <span>✳</span>
                  </div>

                  <div className="floating-card card-top">
                    <span className="mini-dot" />
                    Creatividad sin límites
                  </div>

                  <div className="floating-card card-bottom">
                    <span className="sparkle">✦</span>

                    <div>
                      <strong>AI CREATION</strong>
                      <small>Tu próxima gran idea</small>
                    </div>
                  </div>
                </div>
              </section>

              <div className="section-heading">
                <div>
                  <h2>¿Qué quieres crear?</h2>
                  <p>Elige una herramienta para comenzar.</p>
                </div>
              </div>

              <div className="tool-grid">
                <button
                  className="tool-card"
                  onClick={() => openCreator("Crear video")}
                >
                  <span className="tool-icon purple">▶</span>

                  <strong>Generar video</strong>

                  <p>
                    Convierte una idea o descripción en un video.
                  </p>

                  <span className="tool-arrow">↗</span>
                </button>

                <button
                  className="tool-card"
                  onClick={() => openCreator("Anime")}
                >
                  <span className="tool-icon pink">✧</span>

                  <strong>Crear anime</strong>

                  <p>
                    Diseña personajes y escenas para tus historias.
                  </p>

                  <span className="tool-arrow">↗</span>
                </button>

                <button
                  className="tool-card"
                  onClick={() => openCreator("Editor")}
                >
                  <span className="tool-icon blue">▣</span>

                  <strong>Editor creativo</strong>

                  <p>
                    Prepara tu espacio de trabajo audiovisual.
                  </p>

                  <span className="tool-arrow">↗</span>
                </button>
              </div>
            </>
          ) : activeSection === "Crear video" ||
            activeSection === "Anime" ? (
            <section className="creator-panel">
              <div className="tag">
                <span>✦</span> HERRAMIENTA CREATIVA
              </div>

              <h1>
                {activeSection === "Anime"
                  ? "Crea tu universo anime."
                  : "Dale vida a tu idea."}
              </h1>

              <p className="panel-description">
                Describe lo que imaginas. SOMBER AI enviará tu
                instrucción a su servidor para interpretarla y preparar
                el plan de creación.
              </p>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleCreate();
                }}
              >
                <label className="field-label" htmlFor="prompt">
                  Describe tu idea
                </label>

                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(event) => {
                    setPrompt(event.target.value);
                    setNotice("");
                  }}
                  placeholder={
                    activeSection === "Anime"
                      ? "Ej.: un guerrero anime bajo la lluvia, luces de neón..."
                      : "Ej.: una ciudad futurista al atardecer, cámara cinematográfica..."
                  }
                  disabled={isGenerating}
                  required
                />

                <label className="field-label" htmlFor="format">
                  Formato del video
                </label>

                <select
                  id="format"
                  value={format}
                  onChange={(event) => setFormat(event.target.value)}
                  disabled={isGenerating}
                >
                  <option value="16:9">Horizontal · 16:9</option>
                  <option value="9:16">Vertical · 9:16</option>
                  <option value="1:1">Cuadrado · 1:1</option>
                </select>

                <button
                  className="primary-button create-button"
                  type="submit"
                  disabled={isGenerating}
                >
                  {isGenerating
                    ? "Conectando con SOMBER AI..."
                    : "Procesar instrucción"}

                  <span>✦</span>
                </button>
              </form>

              {notice && (
                <p className="notice" role="status">
                  {notice}
                </p>
              )}

              {isGenerating && (
                <div
                  className="notice"
                  role="status"
                  aria-live="polite"
                >
                  Enviando tu instrucción a SOMBER AI. La primera
                  conexión puede tardar unos segundos mientras se
                  activa el servidor.
                </div>
              )}

              <p className="helper">
                Formato seleccionado: {format}. En esta primera etapa,
                SOMBER AI interpreta las instrucciones y prepara el
                plan. La generación real de videos se integrará después.
              </p>

              {apiResult && (
                <section
                  className="creator-result"
                  aria-live="polite"
                >
                  <div className="section-heading">
                    <div>
                      <h2>Respuesta de SOMBER AI</h2>

                      <p>
                        El servidor ha recibido y procesado tu
                        instrucción.
                      </p>
                    </div>

                    <span className="status">
                      {apiResult.estado || "Procesado"}
                    </span>
                  </div>

                  <div className="result-summary">
                    <h3>
                      {apiResult.nombre || "SOMBER AI"}
                    </h3>

                    <p>
                      Etapa {apiResult.etapa ?? 1}: interpretación
                      y preparación del plan.
                    </p>

                    {apiResult.instruccion && (
                      <>
                        <h3>Instrucción interpretada</h3>

                        <pre
                          style={{
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {JSON.stringify(
                            apiResult.instruccion,
                            null,
                            2
                          )}
                        </pre>
                      </>
                    )}

                    {apiResult.pasos &&
                      apiResult.pasos.length > 0 && (
                        <>
                          <h3>Pasos previstos</h3>

                          <ol>
                            {apiResult.pasos.map((paso, index) => (
                              <li key={`${paso}-${index}`}>
                                {paso}
                              </li>
                            ))}
                          </ol>
                        </>
                      )}

                    {apiResult.avisos &&
                      apiResult.avisos.length > 0 && (
                        <>
                          <h3>Información importante</h3>

                          <ul>
                            {apiResult.avisos.map(
                              (aviso, index) => (
                                <li key={`${aviso}-${index}`}>
                                  {aviso}
                                </li>
                              )
                            )}
                          </ul>
                        </>
                      )}

                    {apiResult.entorno &&
                      typeof apiResult.entorno.motivo ===
                        "string" && (
                        <>
                          <h3>Estado del motor</h3>

                          <p>
                            {apiResult.entorno.motivo}
                          </p>
                        </>
                      )}

                    {apiResult.resultado == null && (
                      <p className="helper">
                        Todavía no se ha generado un archivo de video.
                        El motor audiovisual está pendiente de
                        integración.
                      </p>
                    )}

                    <details>
                      <summary>
                        Ver respuesta técnica completa
                      </summary>

                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {JSON.stringify(apiResult, null, 2)}
                      </pre>
                    </details>
                  </div>
                </section>
              )}
            </section>
          ) : (
            <section className="empty-panel">
              <div className="empty-icon">✦</div>

              <h1>{activeSection}</h1>

              <p>
                Estamos preparando esta sección para integrarla
                en tu estudio.
              </p>

              <button
                className="secondary-button"
                onClick={() => openCreator("Inicio")}
              >
                Volver al inicio
              </button>
            </section>
          )}

          <footer className="footer">
            <span>© 2026 SOMBER AI STUDIO</span>

            <span>
              CREATIVIDAD · TECNOLOGÍA · IMAGINACIÓN
            </span>
          </footer>
        </section>
      </div>
    </main>
  );
}
