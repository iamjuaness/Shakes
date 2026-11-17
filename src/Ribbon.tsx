import { useEffect } from "react";
import { Node, STATUSES, Status, esContenedor } from "./tree";
import type { ToolHost, ToolPlugin } from "./pluginApi";
import type { ExportKind } from "./exporting";
import { t, tr } from "./i18n";

export interface Tab { id: string; label: string }
export interface RibbonProps {
  tabs: Tab[]; more: Tab[]; tab: string; onTab: (id: string) => void;
  book: Node; scope: Node; current?: Node; ambito: "libro" | "todo"; onAmbito: () => void;
  goal: number; onGoal: (n: number) => void; onConvert: () => void;
  onNew: () => void; onOpen: () => void; onSave: () => void; onSaveAs: () => void; onClose: () => void; onExport: (k: ExportKind) => void;
  onStructure: () => void; onSceneTpl?: () => void; onAddCard: () => void;
  onScene: (patch: Partial<Node>) => void;
  tools: ToolPlugin[]; host: ToolHost;
  focus: boolean; onFocus: () => void; onSettings: () => void;
}

const num = (v: string) => Math.max(0, Math.floor(Number(v))) || 0;

// Menús <details>: se cierran al hacer clic fuera o al elegir una opción.
function useCloseMenus() {
  useEffect(() => {
    const f = (e: MouseEvent) => document.querySelectorAll<HTMLDetailsElement>("details.menu[open]").forEach((d) => { if (!d.contains(e.target as globalThis.Node)) d.open = false; });
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, []);
}
const item = (e: React.MouseEvent, run: () => void) => { (e.currentTarget as HTMLElement).closest("details")?.removeAttribute("open"); run(); };

export function Ribbon(p: RibbonProps) {
  useCloseMenus();
  const scene = p.current?.kind === "scene" ? p.current : undefined;
  const moreOn = p.more.find((m) => m.id === p.tab);
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
            <span className="muted">{t("file.exportH")}{esContenedor(p.book.kind) && ` · ${p.scope.kind === "book" ? `«${p.scope.title}»` : t("export.all")}`}</span>
            {(["md", "docx", "epub", "pdf"] as const).map((k) => <button key={k} onClick={(e) => item(e, () => p.onExport(k))}>{t(`export.${k}`)}</button>)}
            <hr />
            <button title={t("file.close.title")} onClick={(e) => item(e, p.onClose)}>{t("file.close")}</button>
          </div>
        </details>
        {p.tabs.map((x) => <button key={x.id} role="tab" aria-selected={p.tab === x.id} className={p.tab === x.id ? "on" : ""} onClick={() => p.onTab(x.id)}>{x.label}</button>)}
        {p.more.length > 0 && (
          <details className="menu moremenu">
            <summary className={moreOn ? "on" : ""}>{moreOn ? `${moreOn.label} ▾` : t("tabs.more")}</summary>
            <div>{p.more.map((m) => <button key={m.id} role="tab" aria-selected={p.tab === m.id} onClick={(e) => item(e, () => p.onTab(m.id))}>{m.label}</button>)}</div>
          </details>
        )}
      </div>
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
            <span className="rlabel">{t("g.scene")}</span>
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
        {p.tools.some((x) => x.actions?.length) && (
          <div className="rgroup">
            <div className="rbtns">
              <details className="menu">
                <summary>{t("tools.menu")}</summary>
                <div>{p.tools.flatMap((x) => (x.actions ?? []).map((a) => <button key={x.id + a.label} onClick={(e) => item(e, () => void a.run(p.host))}>{tr("a." + a.label, a.label)}</button>))}</div>
              </details>
            </div>
            <span className="rlabel">{t("g.plugins")}</span>
          </div>
        )}
        <div className="rgroup">
          <div className="rbtns">
            <button onClick={p.onFocus}>{p.focus ? t("view.exit") : t("view.focus")}</button>
            <button title={t("settings.open")} aria-label={t("settings.open")} className={p.tab === "settings" ? "on" : ""} onClick={p.onSettings}>⚙</button>
          </div>
          <span className="rlabel">{t("g.view")}</span>
        </div>
      </div>
    </nav>
  );
}
