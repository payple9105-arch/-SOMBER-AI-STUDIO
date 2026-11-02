import { useState } from "react";

export default function App() {
  const [msg] = useState("Actualización en curso");
  return (
    <div style={{ minHeight: "100vh", background: "#070b16", color: "#eef2fb", fontFamily: "system-ui", padding: 24 }}>
      <div style={{ maxWidth: 520, margin: "10vh auto", background: "#10182b", border: "1px solid #243049", borderRadius: 18, padding: 28, boxShadow: "0 0 60px rgba(123,97,255,0.25)" }}>
        <div style={{ width: 40, height: 40, borderRadius: 999, background: "#7b61ff", display: "grid", placeItems: "center", fontWeight: 700, marginBottom: 16 }}>S</div>
        <h1 style={{ margin: "0 0 8px" }}>SOMBER AI STUDIO</h1>
        <p style={{ color: "#93a0b8" }}>{msg}</p>
        <p style={{ color: "#93a0b8", fontSize: 14 }}>
          Estamos restaurando la app completa. Restaura src/App.tsx desde el commit ae6daeb en GitHub (botón History → restore).
        </p>
        <a
          href="https://github.com/payple9105-arch/-SOMBER-AI-STUDIO/blob/ae6daebf48070ae437129f982f3c7a49c528f920/src/App.tsx"
          style={{ display: "inline-block", marginTop: 12, background: "#7b61ff", color: "white", textDecoration: "none", padding: "12px 18px", borderRadius: 12, fontWeight: 700 }}
        >
          Abrir App.tsx bueno
        </a>
      </div>
    </div>
  );
}
