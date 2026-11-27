import React from "react";
import ReactDOM from "react-dom/client";
import Root from "./Root";
import "./App.css";
import { idbGet } from "./store";
import { normalize } from "./tree";
import { loadSettings } from "./settings";
import { enTauri, instalarArchivosNativos } from "./tauriFs";

// Carga el proyecto (IndexedDB; migra el localStorage del formato anterior) y el handle del archivo antes de pintar.
async function boot() {
  if (enTauri()) instalarArchivosNativos(); // escritorio: diálogos y archivos nativos
  await loadSettings(); // idioma y tema antes del primer pintado
  let project: ReturnType<typeof normalize> | null = null; // sin proyecto guardado: pantalla de inicio
  try {
    const saved = await idbGet<unknown>("project");
    const legacy = localStorage.getItem("shakes.book");
    if (saved) project = normalize(saved);
    else if (legacy) project = normalize(JSON.parse(legacy));
  } catch {}
  let handle: any = null;
  try { handle = (await idbGet("handle")) ?? null; } catch {}
  let granted = false;
  try { granted = !!handle && (await handle.queryPermission({ mode: "readwrite" })) === "granted"; } catch {}
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <Root initial={project} handle={handle} granted={granted} />
    </React.StrictMode>,
  );
}
boot();
