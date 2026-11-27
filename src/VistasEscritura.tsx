// Dos formas más de escribir: varios capítulos seguidos (vista continua) y dos a la vez (editor dividido).
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Node } from "./tree";
import { t } from "./i18n";

// Texto sin formato del capítulo mientras su editor no se ha montado (nunca se inserta como HTML).
const previa = (html = "") => html.replace(/<\/(p|h\d|li)>/g, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

// El editor se crea al acercarse a la pantalla: un libro largo no monta cincuenta editores de golpe.
function Capitulo({ nodo, editor, onAbrir }: { nodo: Node; editor: () => ReactNode; onAbrir: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const [visto, setVisto] = useState(false);
  useEffect(() => {
    if (visto || !ref.current) return;
    if (typeof IntersectionObserver === "undefined") return setVisto(true);
    const o = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setVisto(true), { rootMargin: "600px" });
    o.observe(ref.current);
    return () => o.disconnect();
  }, [visto]);
  return (
    <section ref={ref} aria-label={nodo.title}>
      <h2><button onClick={onAbrir} title={t("vista.abrir")}>{nodo.title}</button></h2>
      {visto ? editor() : <div className="previa" onClick={() => setVisto(true)}>{previa(nodo.content)}</div>}
    </section>
  );
}

export function Continua({ capitulos, inicial, editor, onAbrir }: { capitulos: Node[]; inicial: string; editor: (n: Node) => ReactNode; onAbrir: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // se empieza en el capítulo que estaba abierto
  useEffect(() => { ref.current?.querySelector(`[data-cap="${CSS.escape(inicial)}"]`)?.scrollIntoView?.(); }, [inicial]);
  return (
    <div className="continua" ref={ref}>
      {capitulos.map((n) => <div key={n.id} data-cap={n.id}><Capitulo nodo={n} editor={() => editor(n)} onAbrir={() => onAbrir(n.id)} /></div>)}
    </div>
  );
}

export function Partida({ principal, actual, capitulos, editor }: { principal: ReactNode; actual: string; capitulos: Node[]; editor: (n: Node) => ReactNode }) {
  const [id, setId] = useState("");
  // nunca el mismo capítulo en los dos lados: un editor pisaría lo escrito en el otro
  const otros = capitulos.filter((c) => c.id !== actual);
  const otro = otros.find((c) => c.id === id) ?? otros[0];
  return (
    <div className="partida">
      <div>{principal}</div>
      <div>
        {otro ? (
          <>
            <select aria-label={t("vista.otro")} value={otro.id} onChange={(e) => setId(e.target.value)}>{otros.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
            {editor(otro)}
          </>
        ) : <p className="empty">{t("vista.solo")}</p>}
      </div>
    </div>
  );
}
