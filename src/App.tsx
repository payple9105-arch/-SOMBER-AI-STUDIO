import { useState } from "react";
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
  async function handleCreate() {
    if (!prompt.trim()) {
      setNotice("Escribe una descripción para comenzar.");
      return;
    }
    const promptForAI =
      `${prompt.trim()}\nRequested video format: ${format}.`;
    const generatorUrl =
      "https://6ed441078592c106c8.gradio.live/";
    // Abrir el generador directamente desde el botón.
    const generatorWindow = window.open(
      generatorUrl,
      "_blank"
    );
    if (!generatorWindow) {
      setNotice(
        "El navegador bloqueó la nueva pestaña. Permite las ventanas emergentes e inténtalo de nuevo."
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(promptForAI);
      setNotice(
        "Generador abierto. Tu descripción está copiada. Pégala allí y pulsa Generar vídeo."
      );
    } catch {
      setNotice(
        "Generador abierto. Copia la descripción y pégala allí para crear el vídeo."
      );
    }
  }
  return (
    <main className="app">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => setActiveSection("Inicio")}
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
              onClick={() => {
                setActiveSection(section);
                setNotice("");
              }}
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
            <p>Las herramientas creativas, en un solo lugar.</p>
          </div>
        </aside>
        <section className="content">
          <div className="eyebrow">
            SOMBER AI STUDIO <span>/</span> {activeSection.toUpperCase()}
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
                    Crea videos, genera imágenes y transforma tus historias
                    en experiencias visuales con SOMBER AI STUDIO.
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => setActiveSection("Crear video")}
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
                  onClick={() => setActiveSection("Crear video")}
                >
                  <span className="tool-icon purple">▶</span>
                  <strong>Generar video</strong>
                  <p>Convierte una idea o descripción en un video.</p>
                  <span className="tool-arrow">↗</span>
                </button>
                <button
                  className="tool-card"
                  onClick={() => setActiveSection("Anime")}
                >
                  <span className="tool-icon pink">✧</span>
                  <strong>Crear anime</strong>
                  <p>Diseña personajes y escenas para tus historias.</p>
                  <span className="tool-arrow">↗</span>
                </button>
                <button
                  className="tool-card"
                  onClick={() => setActiveSection("Editor")}
                >
                  <span className="tool-icon blue">▣</span>
                  <strong>Editor creativo</strong>
                  <p>Prepara tu espacio de trabajo audiovisual.</p>
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
                Describe lo que imaginas y abre el generador experimental
                de SOMBER AI STUDIO para crear tu vídeo.
              </p>
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
              />
              <label className="field-label" htmlFor="format">
                Formato del video
              </label>
              <select
                id="format"
                value={format}
                onChange={(event) => setFormat(event.target.value)}
              >
                <option value="16:9">Horizontal · 16:9</option>
                <option value="9:16">Vertical · 9:16</option>
                <option value="1:1">Cuadrado · 1:1</option>
              </select>
              <button
                className="primary-button create-button"
                onClick={handleCreate}
              >
                Generar vídeo con IA <span>✦</span>
              </button>
              {notice && (
                <p className="notice" role="status">
                  {notice}
                </p>
              )}
              <p className="helper">
                Formato seleccionado: {format}. Se abrirá el generador
                experimental en otra pestaña. Pega allí la descripción
                y pulsa Generar vídeo.
              </p>
            </section>
          ) : (
            <section className="empty-panel">
              <div className="empty-icon">✦</div>
              <h1>{activeSection}</h1>
              <p>
                Estamos preparando esta sección para integrarla en tu estudio.
              </p>
              <button
                className="secondary-button"
                onClick={() => setActiveSection("Inicio")}
              >
                Volver al inicio
              </button>
            </section>
          )}
          <footer className="footer">
            <span>© 2026 SOMBER AI STUDIO</span>
            <span>CREATIVIDAD · TECNOLOGÍA · IMAGINACIÓN</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
