import { scenes } from "../../../src/tree";
import { plain } from "../_comun/texto";
import type { ToolHost, ToolPlugin } from "../types";
import { inconsistencias } from "./reglas";

function Panel({ host }: { host: ToolHost }) {
  const list = scenes(host.project.book).map(({ scene }) => ({ id: scene.id, title: scene.title, text: plain(scene.content) }));
  const issues = inconsistencias(host.cards, list);
  const name = (id: string) => host.cards.find((c) => c.id === id)?.name ?? "?";
  const title = (id: string) => list.find((s) => s.id === id)?.title ?? "?";
  return (
    <div className="panel">
      <p className="muted">Compara ojos, pelo y edad escritos en la ficha («ojos azules», «30 años») con lo que dicen las escenas sobre ese personaje.</p>
      {!issues.length && <p>Sin inconsistencias detectadas.</p>}
      <ul className="hits">
        {issues.map((i, k) => (
          <li key={k} onClick={() => host.openScene(i.scene)}>
            <b>{name(i.card)}</b> · {i.attr}: la ficha dice <span className="chip">{i.ficha}</span> y «{title(i.scene)}» dice <span className="chip warnchip">{i.escena}</span>
            <div><button onClick={(e) => { e.stopPropagation(); host.openCard(i.card); }}>Abrir ficha</button></div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const inconsistenciasTool: ToolPlugin = { id: "inconsistencias", name: "Inconsistencias", Panel };
