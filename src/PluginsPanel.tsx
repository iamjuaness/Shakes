import { useEffect, useState } from "react";
import type React from "react";
import { Plugin, PluginState, install, parsePlugin, uninstall } from "./plugins";
import { fetchRemote } from "./remote";
import type { ToolPlugin } from "../plugins/herramientas/types";

type Cat = "herramienta" | "estructuras" | "tema";
const CATS: [Cat, string][] = [["herramienta", "Herramientas"], ["estructuras", "Estructuras"], ["tema", "Temas"]];
export const kind = (p: Plugin): Cat => (p.tool ? "herramienta" : p.themes.length ? "tema" : "estructuras");

export function PluginsPanel({ state, onChange, onMsg, tools, catalog }: { state: PluginState; onChange: (s: PluginState) => void; onMsg: (m: string) => void; tools: ToolPlugin[]; catalog: Plugin[] }) {
  const [cat, setCat] = useState<Cat>("herramienta");
  const [q, setQ] = useState("");
  const [remote, setRemote] = useState<Plugin[]>([]);
  const [net, setNet] = useState<"cargando" | "ok" | string>("cargando");
  const load = () => { setNet("cargando"); fetchRemote().then((r) => { setRemote(r); setNet("ok"); }).catch((e) => setNet(String(e?.message ?? e))); };
  useEffect(load, []);

  function add(p: Plugin) {
    if (p.tool && !tools.some((t) => t.id === p.tool)) return onMsg(`⚠ La herramienta «${p.tool}» necesita una versión más nueva de Shakes.`);
    onChange(install(state, p));
    onMsg(`Plugin «${p.name}» instalado`);
  }
  function addFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.shkp";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      try {
        const p = parsePlugin(JSON.parse(await f.text()));
        if (typeof p === "string") return onMsg("⚠ Plugin no válido: " + p);
        add(p);
      } catch { onMsg("⚠ El archivo no es JSON válido."); }
    };
    input.click();
  }
  const needle = q.trim().toLowerCase();
  const match = (p: Plugin) => kind(p) === cat && (!needle || `${p.name} ${p.id} ${p.description}`.toLowerCase().includes(needle));
  const fromGit = new Set(remote.map((p) => p.id));
  // GitHub manda (versión más nueva); lo incluido en la app completa lo que falte sin conexión.
  const all = [...remote, ...catalog.filter((c) => !fromGit.has(c.id))];
  const installed = state.plugins.filter(match);
  const available = all.filter((c) => !state.plugins.some((p) => p.id === c.id) && match(c));
  const count = (c: Cat) => state.plugins.filter((p) => kind(p) === c).length;
  const themes = state.plugins.flatMap((p) => p.themes.map((t, i) => ({ key: `${p.id}:${i}`, label: `${t.name} (${p.name})` })));
  const row = (p: Plugin, button: React.ReactNode) => (
    <li key={p.id}>
      <div className="v-head">
        <span>{p.name} <em className="muted">v{p.version}{fromGit.has(p.id) ? " · GitHub" : ""}</em><span className="muted">{p.description}</span></span>
        {button}
      </div>
    </li>
  );
  return (
    <div className="panel">
      <div className="row">
        <input type="search" className="grow" placeholder="Buscar plugins…" aria-label="Buscar plugins" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={addFile}>Desde archivo…</button>
      </div>
      <div className="seg" role="tablist">
        {CATS.map(([k, l]) => <button key={k} role="tab" aria-selected={cat === k} className={cat === k ? "on" : ""} onClick={() => setCat(k)}>{l} <span className="muted">{count(k)}</span></button>)}
      </div>
      {cat === "tema" && (
        <>
          <h3>Tema activo</h3>
          <label className="row"><input type="radio" name="theme" checked={!state.theme} onChange={() => onChange({ ...state, theme: null })} /> Predeterminado</label>
          {themes.map((t) => (
            <label key={t.key} className="row"><input type="radio" name="theme" checked={state.theme === t.key} onChange={() => onChange({ ...state, theme: t.key })} /> {t.label}</label>
          ))}
        </>
      )}
      <h3>Instalados</h3>
      {!installed.length && <p className="muted">Ninguno.</p>}
      <ul className="versions">{installed.map((p) => row(p, <button onClick={() => onChange(uninstall(state, p.id))}>Quitar</button>))}</ul>
      <h3>Disponibles <span className="muted">{net === "cargando" ? "· buscando en GitHub…" : net === "ok" ? `· GitHub: ${remote.length} plugins` : `· sin GitHub (${net}); se muestran los incluidos`}</span> <button onClick={load}>Actualizar</button></h3>
      {!available.length && <p className="muted">{needle ? "Sin resultados." : "Todos instalados."}</p>}
      <ul className="versions">{available.map((p) => row(p, <button onClick={() => add(p)}>Instalar</button>))}</ul>
    </div>
  );
}
