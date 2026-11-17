import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { idbGet } from "./store";
import { normalize } from "./tree";

// Carga el proyecto (IndexedDB; migra el localStorage del formato anterior) y el handle del archivo antes de pintar.
async function boot() {
  let project = normalize(null);
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
      <App initial={project} handle={handle} granted={granted} />
    </React.StrictMode>,
  );
}
boot();
