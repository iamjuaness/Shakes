// Barra vertical derecha (estilo VS Code) con un icono por herramienta instalada.
// Una herramienta con solo panel lo abre directamente; las demás despliegan su menú. No salen las que solo actúan
// mientras se escribe ni las que solo exportan (viven en Archivo).
import { useEffect, useRef, useState } from "react";
import type { ToolHost, ToolPlugin } from "./pluginApi";
import { GENERIC_ICON, TOOL_ICONS } from "./toolIcons";
import { t, tr } from "./i18n";

export function ToolBar({ tools, name, tab, onTab, host }: { tools: ToolPlugin[]; name: (x: ToolPlugin) => string; tab: string; onTab: (id: string) => void; host: ToolHost }) {
  const [open, setOpen] = useState<{ id: string; top: number } | null>(null);
  const bar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const out = (e: MouseEvent) => { if (!bar.current?.contains(e.target as Node)) setOpen(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("mousedown", out);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", out); document.removeEventListener("keydown", esc); };
  }, [open]);
  const own = (x: ToolPlugin) => (x.actions ?? []).filter((a) => !a.exporta);
  const shown = tools.filter((x) => x.Panel || own(x).length);
  if (!shown.length) return null;
  const menu = shown.find((x) => x.id === open?.id);
  const panel = (id: string) => { setOpen(null); onTab(tab === id ? "book" : id); };
  return (
    <aside className="actbar" ref={bar} aria-label={t("bar.tools")}>
      {menu && open && (
        <div className="actmenu" style={{ top: Math.max(8, Math.min(open.top, window.innerHeight * 0.4 - 8)) }}>
          <b>{name(menu)}</b>
          {menu.Panel && <button onClick={() => panel(menu.id)}>{t("bar.open")}</button>}
          {own(menu).map((a) => <button key={a.label} onClick={() => { setOpen(null); void a.run(host); }}>{tr("a." + a.label, a.label)}</button>)}
        </div>
      )}
      <nav>
        {shown.map((x) => (
          <button
            key={x.id}
            title={name(x)}
            aria-label={name(x)}
            aria-expanded={x.Panel && !own(x).length ? undefined : open?.id === x.id}
            className={tab === x.id || open?.id === x.id ? "on" : ""}
            onClick={(e) => {
              if (x.Panel && !own(x).length) return panel(x.id);
              setOpen(open?.id === x.id ? null : { id: x.id, top: e.currentTarget.getBoundingClientRect().top });
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={x.icon ?? TOOL_ICONS[x.id] ?? GENERIC_ICON} /></svg>
          </button>
        ))}
      </nav>
    </aside>
  );
}
