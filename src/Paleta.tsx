// Paleta de acciones (Ctrl+K): escribe lo que quieres hacer o a dónde ir, sin buscar en menús.
import { useEffect, useState } from "react";
import { t } from "./i18n";

export interface Accion { grupo: string; nombre: string; run: () => unknown }
const plano = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
export const abrirPaleta = () => window.dispatchEvent(new Event("shakes-paleta"));

// Todas las palabras escritas deben aparecer en el grupo o en el nombre, sin importar tildes ni orden.
export const filtrar = <T extends { grupo: string; nombre: string }>(lista: T[], q: string): T[] => {
  const ws = plano(q).split(/\s+/).filter(Boolean);
  return lista.filter((a) => ws.every((w) => plano(a.grupo + " " + a.nombre).includes(w)));
};

export function Paleta({ acciones }: { acciones: () => Accion[] }) {
  const [abierta, setAbierta] = useState(false);
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  useEffect(() => {
    const abrir = () => { setQ(""); setI(0); setAbierta(true); };
    const tecla = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); abrir(); } };
    window.addEventListener("keydown", tecla);
    window.addEventListener("shakes-paleta", abrir);
    return () => { window.removeEventListener("keydown", tecla); window.removeEventListener("shakes-paleta", abrir); };
  }, []);
  useEffect(() => { document.getElementById("pal-" + i)?.scrollIntoView({ block: "nearest" }); }, [i]);
  if (!abierta) return null;
  const lista = filtrar(acciones(), q).slice(0, 60);
  const hacer = (a?: Accion) => { if (!a) return; setAbierta(false); void a.run(); };
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setAbierta(false)}>
      <div className="dialog paleta" role="dialog" aria-modal="true" aria-label={t("pal.btn")}>
        <input autoFocus type="text" value={q} placeholder={t("pal.ph")} role="combobox" aria-expanded="true" aria-controls="pal-lista" aria-activedescendant={"pal-" + i}
          onChange={(e) => { setQ(e.target.value); setI(0); }}
          onKeyDown={(e) => {
            e.stopPropagation(); // Esc no debe llegar a la app (saldría del modo concentración)
            if (e.key === "Escape") setAbierta(false);
            else if (e.key === "ArrowDown") { e.preventDefault(); setI(Math.min(i + 1, lista.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setI(Math.max(i - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); hacer(lista[i]); }
          }} />
        <ul id="pal-lista" role="listbox">
          {lista.map((a, k) => (
            <li key={k} id={"pal-" + k} role="option" aria-selected={k === i} onMouseMove={() => setI(k)} onClick={() => hacer(a)}>{a.nombre}<span>{a.grupo}</span></li>
          ))}
        </ul>
        {!lista.length && <p className="muted">{t("pal.none")}</p>}
      </div>
    </div>
  );
}
