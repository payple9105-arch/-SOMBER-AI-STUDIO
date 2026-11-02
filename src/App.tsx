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

// TEMP: full file will be restored in next commit - minimal boot
export default function App() {
  return (
    <div style={{ minHeight: "100vh", background: "#070b16", color: "#eef2fb", display: "grid", placeItems: "center", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <h1 style={{ color: "#7b61ff" }}>SOMBER AI STUDIO</h1>
        <p>Restaurando aplicación… recarga en unos segundos.</p>
      </div>
    </div>
  );
}
