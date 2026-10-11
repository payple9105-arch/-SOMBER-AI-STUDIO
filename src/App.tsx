import { useState } from "react";
const sections = [
  "Inicio",
  "Crear video",
  "Anime",
  "Proyectos",
  "Editor",
  "Planes",
];
const GENERATOR_URL = "https://6ed441078592c106c8.gradio.live/";
export default function App() {
  const [activeSection, setActiveSection] = useState("Inicio");
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState("16:9");
  const [notice, setNotice] = useState("");
  const [showGenerator, setShowGenerator] = useState(false);
  function handleCreate() {
    if (!prompt.trim()) {
      setNotice("Escribe una descripción para comenzar.");
      return;
    }
    setNotice("");
    setShowGenerator(true);
  }
  function openCreator(section: string) {
    setActiveSection(section);
    setNotice("");
    setShowGenerator(false);
  }
  return (
    <main className="app">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => {
            setActiveSection("Inicio");
            setShowGenerator(false);
            setNotice("");
          }}
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
                  <p>Convierte una idea o descripción en un video.</p>
                  <span className="tool-arrow">↗</span>
                </button>
                <button
                  className="tool-card"
                  onClick={() => openCreator("Anime")}
                >
                  <span className="tool-icon pink">✧</span>
                  <strong>Crear anime</strong>
                  <p>Diseña personajes y escenas para tus historias.</p>
                  <span className="tool-arrow">↗</span>
                </button>
                <button
                  className="tool-card"
                  onClick={() => openCreator("Editor")}
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
                Describe tu idea y utiliza el generador experimental
                integrado en SOMBER AI STUDIO.
              </p>
              {!showGenerator ? (
                <>
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
                    Abrir generador de vídeo <span>✦</span>
                  </button>
                  {notice && (
                    <p className="notice" role="status">
                      {notice}
                    </p>
                  )}
                  <p className="helper">
                    Formato seleccionado: {format}. El generador se mostrará
                    debajo de este formulario.
                  </p>
                </>
              ) : (
                <div className="embedded-generator">
                  <div className="section-heading">
                    <div>
                      <h2>Generador de vídeo con IA</h2>
                      <p>
                        Escribe tu descripción en el generador y pulsa
                        el botón para crear tu vídeo.
                      </p>
                    </div>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      minHeight: "650px",
                      overflow: "hidden",
                      borderRadius: "16px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "#171522",
                    }}
                  >
                    <iframe
                      title="Generador de vídeo SOMBER AI STUDIO"
                      src={GENERATOR_URL}
                      style={{
                        display: "block",
                        width: "100%",
                        height: "650px",
                        border: "0",
                        background: "#171522",
                      }}
                      allow="clipboard-read; clipboard-write"
                      loading="lazy"
                    />
                  </div>
                  <p className="helper">
                    Generador experimental. Debe estar activo para que
                    puedas crear vídeos.
                  </p>
                  <button
                    className="secondary-button"
                    onClick={() => setShowGenerator(false)}
                  >
                    Volver al formulario
                  </button>
                </div>
              )}
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
                onClick={() => openCreator("Inicio")}
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
