import { PluginState, install, parsePlugin, uninstall } from "./plugins";

export function PluginsPanel({ state, onChange, onMsg }: { state: PluginState; onChange: (s: PluginState) => void; onMsg: (m: string) => void }) {
  function add() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.shkp";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      try {
        const p = parsePlugin(JSON.parse(await f.text()));
        if (typeof p === "string") return onMsg("⚠ Plugin no válido: " + p);
        onChange(install(state, p));
        onMsg(`Plugin «${p.name}» instalado`);
      } catch { onMsg("⚠ El archivo no es JSON válido."); }
    };
    input.click();
  }
  const themes = state.plugins.flatMap((p) => p.themes.map((t, i) => ({ key: `${p.id}:${i}`, label: `${t.name} (${p.name})` })));
  return (
    <div className="panel">
      <div className="row"><button onClick={add}>Instalar plugin…</button></div>
      <p className="muted">Un plugin es un archivo JSON (<code>"shakes": 1</code>) que aporta temas, estructuras y plantillas de escena. No ejecuta código.</p>
      <h3>Tema</h3>
      <label className="row"><input type="radio" name="theme" checked={!state.theme} onChange={() => onChange({ ...state, theme: null })} /> Predeterminado</label>
      {themes.map((t) => (
        <label key={t.key} className="row"><input type="radio" name="theme" checked={state.theme === t.key} onChange={() => onChange({ ...state, theme: t.key })} /> {t.label}</label>
      ))}
      <h3>Instalados</h3>
      {!state.plugins.length && <p className="muted">Ninguno.</p>}
      <ul className="versions">
        {state.plugins.map((p) => (
          <li key={p.id}>
            <div className="v-head">
              <span>{p.name} <em className="muted">v{p.version}</em>
                <span className="muted">{p.description} · {p.themes.length} temas, {p.structures.length} estructuras, {p.sceneTemplates.length} plantillas de escena</span></span>
              <button onClick={() => onChange(uninstall(state, p.id))}>Quitar</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
