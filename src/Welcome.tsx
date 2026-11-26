import { useEffect, useState } from "react";
import { recentList, recentRemove } from "./store";
import type { Recent } from "./store";
import { createProject, safeName } from "./newProject";
import { newProject, templates } from "./tree";
import { canPickDir, canSavePick, isAbort, pickProject, readHandle, saveProjectAs, writeProject } from "./fileio";
import { getLang, t } from "./i18n";
import { SPELL_LANGS, langName } from "./spell";
import { SettingsPanel } from "./SettingsPanel";
import { getProjectsDir, setProjectsDir } from "./settings";
import type { Update } from "./update";
import type { Formato, Project, Template, Tipo } from "./tree";

const w = window as any; // solo showDirectoryPicker (el resto de E/S va en fileio.ts)
export interface Session { project: Project; handle: any }

// Plantillas de inicio: la primera es un proyecto totalmente en blanco (raíz vacía, sin libro ni partes).
// Después del proyecto en blanco, un tipo de obra para cada clase de escrito (novela, poesía, diario, teatro, cómic…).
const FORMATOS_INICIO: [string, Formato, Tipo][] = [["book", "novel", "book"], ["short", "short", "book"], ["poetry", "poetry", "book"], ["essay", "essay", "book"], ["article", "article", "book"], ["diary", "diary", "book"], ["letters", "letters", "book"], ["script", "film", "script"], ["theatre", "theatre", "script"], ["comic", "comic", "script"], ["audio", "audio", "script"]];
const plantillas = (): { id: string; nombre: string; info: string; tipo: Tipo; tpl?: Template; formato?: Formato }[] => [
  { id: "blank", nombre: t("pl.blank"), info: t("pl.blank.i"), tipo: "blank" },
  ...FORMATOS_INICIO.map(([id, formato, tipo]) => ({ id, nombre: t(`pl.${id}` as "pl.book"), info: t(`pl.${id}.i` as "pl.book.i"), tipo, formato })),
  { id: "saga", nombre: t("pl.saga"), info: t("pl.saga.i"), tipo: "saga" },
  { id: "universe", nombre: t("pl.universe"), info: t("pl.universe.i"), tipo: "universe" },
  ...templates().map((tp, i) => ({ id: "t" + i, nombre: tp.name, info: t("pl.tpl.i", { n: tp.parts.length }), tipo: "book" as Tipo, tpl: tp })),
];

// Pantalla de inicio: proyectos recientes, plantillas (la primera, en blanco) y abrir uno existente.
export function Welcome({ onOpen, onCancel, update, onUpdate }: { onOpen: (s: Session) => void; onCancel?: () => void; update: Update | null; onUpdate: (u: Update | null) => void }) {
  const [view, setView] = useState<"home" | "settings">("home");
  const [name, setName] = useState("");
  const [lang, setLang] = useState<string>(getLang()); // idioma en que se escribirá (corrector), no el de la interfaz
  const [plId, setPlId] = useState("blank");
  const PLANTILLAS = plantillas();
  const pl = PLANTILLAS.find((p) => p.id === plId) ?? PLANTILLAS[0];
  const [recientes, setRecientes] = useState<Recent[]>([]);
  useEffect(() => { recentList().then(setRecientes); }, []);
  const [dir, setDir] = useState<any>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [err, setErr] = useState("");
  const [enCarpeta, setEnCarpeta] = useState(false); // crear el .shks directamente en la carpeta elegida
  const can = canPickDir();
  useEffect(() => { getProjectsDir().then((d) => { if (d) { setDir(d); setIsDefault(true); } }).catch(() => {}); }, []);

  async function pick() {
    try { const d = await w.showDirectoryPicker({ mode: "readwrite", startIn: dir ?? "documents" }); setDir(d); setIsDefault(false); } catch {}
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      if (!can) return await createFileOnly();
      if (!dir) return setErr(t("wl.errFolder"));
      if ((await dir.requestPermission({ mode: "readwrite" })) !== "granted") return setErr(t("wl.errPerm"));
      const r = await createProject(name, dir, pl.tipo, pl.tpl, enCarpeta, lang, pl.formato);
      if (typeof r === "string") return setErr(r);
      await setProjectsDir(isDefault ? dir : null);
      onOpen(r);
    } catch (x: any) { setErr(t("wl.errCreate", { e: x?.message ?? x })); }
  }
  // Sin selector de carpetas (Firefox, Safari…): no se puede crear la carpeta; se guarda solo el .shks.
  async function createFileOnly() {
    const title = name.trim();
    const project = newProject(pl.tipo, title, pl.tpl, lang, pl.formato);
    const r = await saveProjectAs(project, safeName(title) || "proyecto");
    if (!r) return;
    if (r.handle) await writeProject(r.handle, project);
    onOpen({ project, handle: r.handle });
  }
  async function openRecent(r: Recent) {
    setErr("");
    try {
      if ((await r.handle.requestPermission({ mode: "readwrite" })) !== "granted") return setErr(t("wl.errPermOpen", { n: r.name }));
      onOpen({ project: await readHandle(r.handle), handle: r.handle });
    } catch { setErr(t("wl.errOpen", { n: r.name })); }
  }
  // Abrir carpeta: abre el único .shks que contenga; si no hay ninguno, la deja elegida para crear uno dentro.
  async function openFolder() {
    setErr("");
    try {
      const d = await w.showDirectoryPicker({ mode: "readwrite", startIn: dir ?? "documents" });
      const files: any[] = [];
      for await (const e of d.values()) if (e.kind === "file" && /\.(shks|shakes)$/i.test(e.name)) files.push(e);
      if (files.length === 1) return onOpen({ project: await readHandle(files[0]), handle: files[0] });
      if (files.length > 1) return setErr(t("wl.multi", { n: d.name, c: files.length }));
      setDir(d); setIsDefault(false); setEnCarpeta(true);
      setErr(t("wl.noShks", { n: d.name }));
    } catch (x: any) { if (!isAbort(x)) setErr(t("wl.errFolderOpen", { e: x?.message ?? x })); }
  }
  async function open() {
    try { const r = await pickProject(); if (r) onOpen({ project: r.project, handle: r.handle }); }
    catch { setErr(t("wl.errFile")); }
  }

  return (
    <div className="welcome">
      <nav className="wside">
        <h1>Shakes</h1>
        <button type="button" onClick={open}>{t("wl.open")}</button>
        <button type="button" onClick={openFolder} disabled={!can}>{t("wl.folder")}</button>
        {onCancel && <button type="button" onClick={onCancel}>{t("wl.back")}</button>}
        <button type="button" className={view === "settings" ? "on" : ""} onClick={() => setView(view === "home" ? "settings" : "home")}>{t("wl.settings")}</button>
      </nav>
      <main className="wmain">
        {view === "settings" ? <SettingsPanel update={update} onUpdate={onUpdate} /> : <>
        <h2>{t("wl.new")}</h2>
        <div className="plantillas" role="radiogroup" aria-label={t("wl.templates")}>
          {PLANTILLAS.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={plId === p.id} className={plId === p.id ? "on" : ""} onClick={() => setPlId(p.id)}>
              <span className={`thumb ${p.id === "blank" ? "blank" : ""}`} aria-hidden="true">{p.id === "blank" ? "+" : p.nombre.slice(0, 1)}</span>
              <strong>{p.nombre}</strong><small>{p.info}</small>
            </button>
          ))}
        </div>
        <form onSubmit={create} className="wform">
          <h3>{pl.nombre}</h3>
          <label>{t("wl.name")}<input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t("wl.namePh")} /></label>
          <label>{t("wl.lang")}<select value={lang} onChange={(e) => setLang(e.target.value)}>
            {SPELL_LANGS.map((c) => [c, langName(c)]).sort((a, b) => a[1].localeCompare(b[1])).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select></label>
          {can && <div className="where">
            <span className="muted">{t("wl.willBe")}</span>
            <strong>{dir ? (enCarpeta ? `${dir.name}/` : `${dir.name}/${name.trim() || "…"}/`) : t("wl.noFolder")}</strong>
            <button type="button" onClick={pick}>{t("wl.pickFolder")}</button>
          </div>}
          {can && <label className="check"><input type="checkbox" checked={enCarpeta} onChange={(e) => setEnCarpeta(e.target.checked)} /> {t("wl.inFolder")}</label>}
          {can && <label className="check"><input type="checkbox" checked={isDefault} disabled={!dir} onChange={(e) => setIsDefault(e.target.checked)} /> {t("wl.always")}</label>}
          {!can && <p className="muted">{t("wl.noPicker", { how: canSavePick() ? t("wl.noPicker.where") : t("wl.noPicker.dl") })}</p>}
          {err && <p className="warn">{err}</p>}
          <div className="row"><button type="submit" className="primary" disabled={!name.trim()}>{t("wl.create")}</button></div>
        </form>
        <h2>{t("wl.recent")}</h2>
        {recientes.length === 0 ? <p className="muted">{t("wl.noRecent")}</p> : (
          <ul className="recientes">
            {recientes.map((r) => (
              <li key={r.name + r.at}>
                <button type="button" onClick={() => openRecent(r)}><strong>{r.name.replace(/.(shks|shakes)$/, "")}</strong><span>{new Date(r.at).toLocaleString()}</span></button>
                <button type="button" className="x" aria-label={t("wl.removeRecent", { n: r.name })} title={t("wl.removeRecent.title")} onClick={() => recentRemove(r).then(() => setRecientes((l) => l.filter((x) => x !== r)))}>×</button>
              </li>
            ))}
          </ul>
        )}
        </>}
      </main>
    </div>
  );
}
