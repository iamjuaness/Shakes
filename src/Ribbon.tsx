import { useEffect, useRef, useState } from "react";
import { MODOS, modoDe } from "./progreso";
import type { Modo } from "./progreso";
import { Node, STATUSES, Status, conTexto, esContenedor, etiqueta, formatoDe } from "./tree";
import type { ToolHost, ToolPlugin } from "./pluginApi";
import type { ExportKind } from "./exporting";
import type { ImportKind } from "./importing";
import { t, tr } from "./i18n";
import { abrirPaleta } from "./Paleta";

export interface Tab { id: string; label: string }
export interface RibbonProps {
  tabs: Tab[]; tab: string; onTab: (id: string) => void;
  book: Node; scope: Node; current?: Node; ambito: "libro" | "todo"; onAmbito: () => void;
  goal: number; onGoal: (n: number) => void; onConvert: () => void;
  onNew: () => void; onOpen: () => void; onSave: () => void; onSaveAs: () => void; onClose: () => void; onExport: (k: ExportKind) => void; onImport: (k: ImportKind) => void;
  onStructure: () => void; onSceneTpl?: () => void; onAddCard: () => void;
  onScene: (patch: Partial<Node>) => void;
  tools: ToolPlugin[]; host: ToolHost;
  focus: boolean; onFocus: () => void; onSettings: () => void;
  quiet: boolean; onQuiet: () => void;
  vista: Vista; onVista: (v: Vista) => void;
}
export type Vista = "normal" | "partida" | "continua";

const num = (v: string) => Math.max(0, Math.floor(Number(v))) || 0;

const close = (d: HTMLDetailsElement) => [d, ...d.querySelectorAll("details")].forEach((x) => (x.open = false));
// Menús <details>: se cierran al hacer clic fuera o al elegir una opción.
function useCloseMenus() {
  useEffect(() => {
    const f = (e: MouseEvent) => document.querySelectorAll<HTMLDetailsElement>("details.menu[open]").forEach((d) => { if (!d.contains(e.target as globalThis.Node)) close(d); });
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, []);
}
const item = (e: React.MouseEvent, run: () => void) => { close((e.currentTarget as HTMLElement).closest<HTMLDetailsElement>("details.menu")!); run(); };

export function Ribbon(p: RibbonProps) {
  useCloseMenus();
  const scene = p.current && conTexto(p.current.kind) ? p.current : undefined; // capítulo (libro) o escena (guion)
  // Las pestañas se agrupan en cuatro modos; cada modo recuerda dónde estabas. Guía y Plugins quedan fuera.
  const modo = modoDe(p.tab);
  const [ultimo, setUltimo] = useState<Modo>("escribir");
  useEffect(() => { if (modo) setUltimo(modo); }, [modo]);
  const recuerdo = useRef<Partial<Record<Modo, string>>>({});
  if (modo) recuerdo.current[modo] = p.tab;
  const activo = modo ?? ultimo;
  const tabsDe = (m: Modo) => MODOS.find((x) => x.id === m)!.tabs.flatMap((id) => p.tabs.find((x) => x.id === id) ?? []);
  const pestana = (id: string) => <button key={id} role="tab" aria-selected={p.tab === id} className={p.tab === id ? "on" : ""} onClick={() => p.onTab(id)}>{p.tabs.find((x) => x.id === id)?.label}</button>;
  return (
    <nav className="topbar">
      <div className="tabs" role="tablist">
        <details className="menu filemenu">
          <summary>{t("file.menu")}</summary>
          <div>
            <button onClick={(e) => item(e, p.onNew)}>{t("file.new")}<kbd>Ctrl+N</kbd></button>
            <button onClick={(e) => item(e, p.onOpen)}>{t("file.open")}<kbd>Ctrl+O</kbd></button>
            <button onClick={(e) => item(e, p.onSave)}>{t("file.save")}<kbd>Ctrl+S</kbd></button>
            <button onClick={(e) => item(e, p.onSaveAs)}>{t("file.saveas")}<kbd>Ctrl+Shift+S</kbd></button>
            <hr />
            <details className="submenu" name="filesub">
              <summary>{t("file.importH")}<span aria-hidden>▸</span></summary>
              <div>
                {(["md", "docx"] as const).map((k) => <button key={k} onClick={(e) => item(e, () => p.onImport(k))}>{t(`import.${k}`)}</button>)}
              </div>
            </details>
            <details className="submenu" name="filesub">
              <summary>{t("file.exportH")}<span aria-hidden>▸</span></summary>
              <div>
                {esContenedor(p.book.kind) && <span className="muted">{t("export.scope", { what: p.scope.kind === "book" ? `«${p.scope.title}»` : t("export.all") })}</span>}
                {(["md", "docx", "epub", "pdf", "html", "tex", "fountain"] as const).filter((k) => k !== "fountain" || p.scope.kind !== "script").map((k) => <button key={k} onClick={(e) => item(e, () => p.onExport(k))}>{t(`export.${k}`)}</button>)}
                {p.tools.flatMap((x) => (x.actions ?? []).filter((a) => a.exporta).map((a) => <button key={x.id + a.label} onClick={(e) => item(e, () => void a.run(p.host))}>{tr("a." + a.label, a.label)}</button>))}
              </div>
            </details>
            <hr />
            <button title={t("file.close.title")} onClick={(e) => item(e, p.onClose)}>{t("file.close")}</button>
          </div>
        </details>
        {pestana("guide")}
        <div className="modos" role="tablist" aria-label={t("modo.titulo")}>
          {MODOS.map((m) => <button key={m.id} role="tab" aria-selected={modo === m.id} className={activo === m.id && p.tab !== "guide" ? "on" : ""} onClick={() => p.onTab(recuerdo.current[m.id] ?? tabsDe(m.id)[0].id)}>{t(`modo.${m.id}`)}</button>)}
        </div>
        <span className="spacer" />
        {pestana("plugins")}
      </div>
      <div className="tabs subtabs" role="tablist">{tabsDe(activo).map((x) => pestana(x.id))}</div>
      <div className="ribbon">
        <div className="rgroup">
          <div className="rbtns">
            {p.tab !== "cards" && p.tab !== "map" && <button onClick={p.onStructure}>{t("ins.structure")}</button>}
            {p.tab === "book" && scene && p.onSceneTpl && <button onClick={p.onSceneTpl}>{t("ins.sceneTpl")}</button>}
            {(p.tab === "cards" || p.tab === "map") && <button onClick={p.onAddCard}>{t("ins.card")}</button>}
          </div>
          <span className="rlabel">{t("g.insert")}</span>
        </div>
        {p.tab === "book" && scene && (
          <div className="rgroup">
            <div className="rbtns">
              <label className="fld">{t("scene.status")}
                <select value={scene.status ?? ""} onChange={(e) => p.onScene({ status: (e.target.value || undefined) as Status | undefined })}>
                  <option value="">{t("status.none")}</option>
                  {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                </select>
              </label>
              <label className="fld">{t("scene.date.label")}<input type="date" aria-label={t("scene.date")} value={scene.date ?? ""} onChange={(e) => p.onScene({ date: e.target.value })} /></label>
              <label className="fld">{t("scene.goal.label")}<input type="number" min={0} className="goal" aria-label={t("scene.goal")} placeholder={t("scene.goal.ph")} value={scene.goal || ""} onChange={(e) => p.onScene({ goal: num(e.target.value) || undefined })} /></label>
            </div>
            <span className="rlabel">{etiqueta(scene.kind, formatoDe(p.book, scene.id))}</span>
          </div>
        )}
        <div className="rgroup">
          <div className="rbtns">
            {esContenedor(p.book.kind) && <button title={t("proj.scope.title")} onClick={p.onAmbito}>{t("proj.scope", { v: p.ambito === "libro" ? t("proj.scope.book") : t("proj.scope.all") })}</button>}
            {(p.book.kind === "book" || p.book.kind === "saga") && <button onClick={p.onConvert}>{p.book.kind === "book" ? t("proj.toSaga") : t("proj.toUniverse")}</button>}
            <label className="fld">{t("proj.goal.label")}<input type="number" min={0} className="goal" aria-label={t("proj.goal.label")} value={p.goal || ""} placeholder="0" onChange={(e) => p.onGoal(num(e.target.value))} /></label>
          </div>
          <span className="rlabel">{t("g.project")}</span>
        </div>
        <div className="rgroup">
          <div className="rbtns">
            {p.tab === "book" && scene && (["partida", "continua"] as const).map((v) => <button key={v} className={p.vista === v ? "on" : ""} aria-pressed={p.vista === v} onClick={() => p.onVista(p.vista === v ? "normal" : v)}>{t(`vista.${v}`)}</button>)}
            <button className="buscar-accion" title={t("pal.title")} aria-label={t("pal.btn")} onClick={abrirPaleta}>🔍 <kbd>Ctrl+K</kbd></button>
            <button onClick={p.onFocus}>{p.focus ? t("view.exit") : t("view.focus")}</button>
            <button title={t("view.quiet.title")} className={p.quiet ? "on" : ""} aria-pressed={p.quiet} onClick={p.onQuiet}>{p.quiet ? t("view.check") : t("view.quiet")}</button>
            <button title={t("settings.open")} aria-label={t("settings.open")} className={p.tab === "settings" ? "on" : ""} onClick={p.onSettings}>⚙</button>
          </div>
          <span className="rlabel">{t("g.view")}</span>
        </div>
      </div>
    </nav>
  );
}
