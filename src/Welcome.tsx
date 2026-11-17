import { useEffect, useState } from "react";
import { idbGet, idbSet, recentList, recentRemove } from "./store";
import type { Recent } from "./store";
import { createProject, safeName } from "./newProject";
import { TEMPLATES, newProject, normalize } from "./tree";
import type { Project, Template, Tipo } from "./tree";

const w = window as any;
export interface Session { project: Project; handle: any }

// Plantillas de inicio: la primera es un proyecto totalmente en blanco (raíz vacía, sin libro ni partes).
const PLANTILLAS: { id: string; nombre: string; info: string; tipo: Tipo; tpl?: Template }[] = [
  { id: "blank", nombre: "En blanco", info: "Nada creado: tú montas la estructura desde cero.", tipo: "blank" },
  { id: "book", nombre: "Libro", info: "Una sola historia: parte, capítulo y escena.", tipo: "book" },
  { id: "saga", nombre: "Saga / trilogía", info: "Varios libros con fichas compartidas.", tipo: "saga" },
  { id: "universe", nombre: "Universo", info: "Sagas y libros sueltos del mismo mundo.", tipo: "universe" },
  ...TEMPLATES.map((t, i) => ({ id: "t" + i, nombre: t.name, info: `Libro con ${t.parts.length} partes de estructura.`, tipo: "book" as Tipo, tpl: t })),
];

// Pantalla de inicio: proyectos recientes, plantillas (la primera, en blanco) y abrir uno existente.
export function Welcome({ onOpen, onCancel }: { onOpen: (s: Session) => void; onCancel?: () => void }) {
  const [name, setName] = useState("");
  const [plId, setPlId] = useState("blank");
  const pl = PLANTILLAS.find((p) => p.id === plId)!;
  const [recientes, setRecientes] = useState<Recent[]>([]);
  useEffect(() => { recentList().then(setRecientes); }, []);
  const [dir, setDir] = useState<any>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [err, setErr] = useState("");
  const [enCarpeta, setEnCarpeta] = useState(false); // crear el .shks directamente en la carpeta elegida
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
      const r = await createProject(name, dir, pl.tipo, pl.tpl, enCarpeta);
      if (typeof r === "string") return setErr(r);
      await idbSet("projectsDir", isDefault ? dir : null);
      onOpen(r);
    } catch (x: any) { setErr("No se pudo crear: " + (x?.message ?? x)); }
  }
  // Sin selector de carpetas (Firefox, Safari…): no se puede crear la carpeta; se guarda solo el .shks.
  async function createFileOnly() {
    const title = name.trim();
    const project = newProject(pl.tipo, title, pl.tpl);
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
  async function openRecent(r: Recent) {
    setErr("");
    try {
      if ((await r.handle.requestPermission({ mode: "readwrite" })) !== "granted") return setErr("Sin permiso para abrir «" + r.name + "».");
      onOpen({ project: normalize(JSON.parse(await (await r.handle.getFile()).text())), handle: r.handle });
    } catch { setErr("No se pudo abrir «" + r.name + "»: ¿se movió o se borró?"); }
  }
  // Abrir carpeta: abre el único .shks que contenga; si no hay ninguno, la deja elegida para crear uno dentro.
  async function openFolder() {
    setErr("");
    try {
      const d = await w.showDirectoryPicker({ mode: "readwrite", startIn: dir ?? "documents" });
      const files: any[] = [];
      for await (const e of d.values()) if (e.kind === "file" && /\.(shks|shakes)$/i.test(e.name)) files.push(e);
      if (files.length === 1) return onOpen({ project: normalize(JSON.parse(await (await files[0].getFile()).text())), handle: files[0] });
      if (files.length > 1) return setErr(`«${d.name}» tiene ${files.length} proyectos: ábrelo con «Abrir existente…».`);
      setDir(d); setIsDefault(false); setEnCarpeta(true);
      setErr(`«${d.name}» no tiene ningún .shks: ponle nombre y pulsa «Crear proyecto» para crearlo aquí.`);
    } catch (x: any) { if (x?.name !== "AbortError") setErr("No se pudo abrir la carpeta: " + (x?.message ?? x)); }
  }
  async function open() {
    try {
      const [h] = await w.showOpenFilePicker({ types: [{ description: "Proyecto Shakes", accept: { "application/json": [".shks", ".shakes"] } }] });
      onOpen({ project: normalize(JSON.parse(await (await h.getFile()).text())), handle: h });
    } catch (x: any) { if (x?.name !== "AbortError") setErr("Archivo no válido."); }
  }

  return (
    <div className="welcome">
      <nav className="wside">
        <h1>Shakes</h1>
        <button type="button" onClick={open} disabled={!w.showOpenFilePicker}>📂 Abrir existente…</button>
        <button type="button" onClick={openFolder} disabled={!can}>🗂 Abrir carpeta…</button>
        {onCancel && <button type="button" onClick={onCancel}>← Volver al proyecto</button>}
      </nav>
      <main className="wmain">
        <h2>Nuevo</h2>
        <div className="plantillas" role="radiogroup" aria-label="Plantilla">
          {PLANTILLAS.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={plId === p.id} className={plId === p.id ? "on" : ""} onClick={() => setPlId(p.id)}>
              <span className={`thumb ${p.id === "blank" ? "blank" : ""}`} aria-hidden="true">{p.id === "blank" ? "+" : p.nombre.slice(0, 1)}</span>
              <strong>{p.nombre}</strong><small>{p.info}</small>
            </button>
          ))}
        </div>
        <form onSubmit={create} className="wform">
          <h3>{pl.nombre}</h3>
          <label>Nombre<input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Mi novela" /></label>
          {can && <div className="where">
            <span className="muted">Se creará en</span>
            <strong>{dir ? (enCarpeta ? `${dir.name}/` : `${dir.name}/${name.trim() || "…"}/`) : "(sin carpeta)"}</strong>
            <button type="button" onClick={pick}>Elegir carpeta…</button>
          </div>}
          {can && <label className="check"><input type="checkbox" checked={enCarpeta} onChange={(e) => setEnCarpeta(e.target.checked)} /> Crear el .shks directamente en esta carpeta (sin subcarpeta)</label>}
          {can && <label className="check"><input type="checkbox" checked={isDefault} disabled={!dir} onChange={(e) => setIsDefault(e.target.checked)} /> Usar esta carpeta siempre (predeterminada)</label>}
          {!can && <p className="muted">Este navegador no puede elegir carpetas: se guardará solo el archivo .shks{w.showSaveFilePicker ? " donde lo indiques" : " como descarga"}. Con Edge o Chrome se crea la carpeta del proyecto.</p>}
          {err && <p className="warn">{err}</p>}
          <div className="row"><button type="submit" className="primary" disabled={!name.trim()}>Crear proyecto</button></div>
        </form>
        <h2>Recientes</h2>
        {recientes.length === 0 ? <p className="muted">Aún no has abierto ningún proyecto.</p> : (
          <ul className="recientes">
            {recientes.map((r) => (
              <li key={r.name + r.at}>
                <button type="button" onClick={() => openRecent(r)}><strong>{r.name.replace(/.(shks|shakes)$/, "")}</strong><span>{new Date(r.at).toLocaleString()}</span></button>
                <button type="button" className="x" aria-label={"Quitar de recientes: " + r.name} title="Quitar de la lista" onClick={() => recentRemove(r).then(() => setRecientes((l) => l.filter((x) => x !== r)))}>×</button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
