// Pestaña «Guía» (qué toca ahora) y el recorrido de la primera vez.
import { useEffect, useState } from "react";
import { pasos, siguiente } from "./progreso";
import type { Node, Project } from "./tree";
import { saveSettings } from "./settings";
import { t } from "./i18n";

export function Guia({ project, obra, onIr }: { project: Project; obra: Node; onIr: (tab: string) => void }) {
  const lista = pasos(project, obra), toca = siguiente(lista);
  return (
    <div className="panel guia">
      <h3>{t("guia.titulo", { t: obra.title })}</h3>
      {toca ? (
        <div className="guia-toca">
          <p><strong>{t("guia.siguiente")}: {t(`guia.${toca.id}`)}</strong></p>
          <p>{t(`guia.${toca.id}.d`)}</p>
          <button className="on" onClick={() => onIr(toca.tab)}>{t("guia.ir")}</button>
        </div>
      ) : <p className="mq-ok">✓ {t("guia.todo")}</p>}
      <ol>
        {lista.map((x) => (
          <li key={x.id} className={x.hecho ? "hecho" : ""}>
            <button onClick={() => onIr(x.tab)}>{x.hecho ? "✓ " : ""}{t(`guia.${x.id}`)}</button>
            <progress value={x.n} max={x.de} aria-label={t(`guia.${x.id}`)} />
            <span className="muted">{x.n} / {x.de}</span>
          </li>
        ))}
      </ol>
      <button onClick={() => saveSettings({ tour: false })}>{t("tour.ver")}</button>
    </div>
  );
}

// Cuatro paradas: cada una resalta su zona.
const PARADAS: [string, "modos" | "arbol" | "herramientas" | "buscar"][] = [[".modos", "modos"], [".sidebar", "arbol"], [".actbar", "herramientas"], [".buscar-accion", "buscar"]];
export function Recorrido() {
  const [i, setI] = useState(0);
  const [selector, id] = PARADAS[i];
  useEffect(() => {
    const el = document.querySelector(selector);
    el?.classList.add("tour-foco");
    return () => el?.classList.remove("tour-foco");
  }, [selector]);
  const fin = () => saveSettings({ tour: true });
  return (
    <div className="tour" role="dialog" aria-label={t("tour.titulo")} onKeyDown={(e) => e.key === "Escape" && fin()}>
      <p><strong>{t(`tour.${id}`)}</strong> <span className="muted">{i + 1} / {PARADAS.length}</span></p>
      <p>{t(`tour.${id}.d`)}</p>
      <div className="row">
        <button onClick={fin}>{t("tour.saltar")}</button>
        <span className="spacer" />
        {i > 0 && <button onClick={() => setI(i - 1)}>{t("tour.atras")}</button>}
        <button className="on" autoFocus onClick={() => (i === PARADAS.length - 1 ? fin() : setI(i + 1))}>{t(i === PARADAS.length - 1 ? "tour.fin" : "tour.mas")}</button>
      </div>
    </div>
  );
}
