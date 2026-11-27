import { L } from "../_comun/idioma";
import { scenes } from "../../../src/tree";
import { plain } from "../_comun/texto";
import type { ToolHost, ToolPlugin } from "../types";
import { inconsistencias } from "./reglas";

const atributo = (a: string) => ({ ojos: L("ojos", "eyes"), pelo: L("pelo", "hair"), edad: L("edad", "age") })[a] ?? a;

function Panel({ host }: { host: ToolHost }) {
  const list = scenes(host.project.book).map(({ scene }) => ({ id: scene.id, title: scene.title, text: plain(scene.content) }));
  const issues = inconsistencias(host.cards, list);
  const name = (id: string) => host.cards.find((c) => c.id === id)?.name ?? "?";
  const title = (id: string) => list.find((s) => s.id === id)?.title ?? "?";
  return (
    <div className="panel">
      <p className="muted">{L("Compara ojos, pelo y edad escritos en la ficha («ojos azules», «30 años») con lo que dicen las escenas sobre ese personaje.", "Compares eyes, hair and age written on the card (“ojos azules”, “30 años”) with what the scenes say about that character. Works on Spanish text.")}</p>
      {!issues.length && <p>{L("Sin inconsistencias detectadas.", "No inconsistencies found.")}</p>}
      <ul className="hits">
        {issues.map((i, k) => (
          <li key={k} onClick={() => host.openScene(i.scene)}>
            <b>{name(i.card)}</b> · {atributo(i.attr)}: {L("la ficha dice", "the card says")} <span className="chip">{i.ficha}</span> {L("y", "and")} «{title(i.scene)}» {L("dice", "says")} <span className="chip warnchip">{i.escena}</span>
            <div><button onClick={(e) => { e.stopPropagation(); host.openCard(i.card); }}>{L("Abrir ficha", "Open card")}</button></div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const inconsistenciasTool: ToolPlugin = { id: "inconsistencias", name: "Inconsistencias", Panel };
