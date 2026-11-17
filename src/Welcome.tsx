import { useEffect, useState } from "react";
import { idbGet, idbSet } from "./store";
import { createProject, safeName } from "./newProject";
import { newProject, normalize } from "./tree";
import type { Project } from "./tree";

const w = window as any;
export interface Session { project: Project; handle: any }

// Pantalla de inicio: crear proyecto (carpeta + .shks) o abrir uno existente. Sin proyecto en blanco al arrancar.
export function Welcome({ onOpen, onCancel }: { onOpen: (s: Session) => void; onCancel?: () => void }) {
  const [name, setName] = useState("");
  const [dir, setDir] = useState<any>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [err, setErr] = useState("");
  const can = !!w.showDirectoryPicker;
  useEffect(() => { idbGet<any>("projectsDir").then((d) => { if (d) { setDir(d); setIsDefault(true); } }).catch(() => {}); }, []);

  async function pick() {
    try { const d = await w.showDirectoryPicker({ mode: "readwrite", startIn: dir ?? "documents" }); setDir(d); setIsDefault(false); } catch {}
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      if (!can) return await createFileOnly();
      if (!dir) return setErr("Elige la carpeta donde se creará el proyecto.");
      if ((await dir.requestPermission({ mode: "readwrite" })) !== "granted") return setErr("Sin permiso para escribir en esa carpeta.");
      const r = await createProject(name, dir);
      if (typeof r === "string") return setErr(r);
      await idbSet("projectsDir", isDefault ? dir : null);
      onOpen(r);
    } catch (x: any) { setErr("No se pudo crear: " + (x?.message ?? x)); }
  }
  // Sin selector de carpetas (Firefox, Safari…): no se puede crear la carpeta; se guarda solo el .shks.
  async function createFileOnly() {
    const base = newProject();
    const title = name.trim();
    const project = { ...base, book: { ...base.book, title } };
    const file = `${safeName(title) || "proyecto"}.shks`;
    if (w.showSaveFilePicker) {
      const handle = await w.showSaveFilePicker({ suggestedName: file, types: [{ description: "Proyecto Shakes", accept: { "application/json": [".shks"] } }] });
      const f = await handle.createWritable();
      await f.write(JSON.stringify(project));
      await f.close();
      return onOpen({ project, handle });
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(project)], { type: "application/json" }));
    a.download = file;
    a.click();
    URL.revokeObjectURL(a.href);
    onOpen({ project, handle: null });
  }
  async function open() {
    try {
      const [h] = await w.showOpenFilePicker({ types: [{ description: "Proyecto Shakes", accept: { "application/json": [".shks", ".shakes"] } }] });
      onOpen({ project: normalize(JSON.parse(await (await h.getFile()).text())), handle: h });
    } catch (x: any) { if (x?.name !== "AbortError") setErr("Archivo no válido."); }
  }

  return (
    <div className="welcome">
      <form onSubmit={create}>
        <h1>Shakes</h1>
        <h2>Proyecto nuevo</h2>
        <label>Nombre<input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Mi novela" /></label>
        {can && <div className="where">
          <span className="muted">Se creará en</span>
          {can && <strong>{dir ? `${dir.name}/${name.trim() || "…"}/` : "(sin carpeta)"}</strong>}
          {can && <button type="button" onClick={pick}>Elegir carpeta…</button>}
        </div>}
        {can && <label className="check"><input type="checkbox" checked={isDefault} disabled={!dir} onChange={(e) => setIsDefault(e.target.checked)} /> Usar esta carpeta siempre (predeterminada)</label>}
        {!can && <p className="muted">Este navegador no puede elegir carpetas: se guardará solo el archivo .shks{w.showSaveFilePicker ? " donde lo indiques" : " como descarga"}. Con Edge o Chrome se crea la carpeta del proyecto.</p>}
        {err && <p className="warn">{err}</p>}
        <div className="row">
          <button type="submit" className="primary" disabled={!name.trim()}>Crear proyecto</button>
          <button type="button" onClick={open} disabled={!w.showOpenFilePicker}>Abrir existente…</button>
          {onCancel && <button type="button" onClick={onCancel}>Cancelar</button>}
        </div>
      </form>
    </div>
  );
}
