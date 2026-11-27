// Piezas de formulario de los paneles que guardan fichas propias (Idiomas, Sistemas de magia).
import { confirmAsk, ask } from "../../../src/dialog";

export function Campo({ label, value, onChange, filas = 2, placeholder }: { label: string; value?: string; onChange: (v: string) => void; filas?: number; placeholder?: string }) {
  return (
    <label className="campo">{label}
      {filas > 1 ? <textarea rows={filas} placeholder={placeholder} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
        : <input placeholder={placeholder} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />}
    </label>
  );
}

export interface Columna<T> { key: keyof T & string; label: string; opciones?: [string, string][] }

// Tabla editable: una fila por elemento.
export function Lista<T extends { id: string }>({ items, columnas, onChange, nuevo, anadir, quitar }: { items: T[]; columnas: Columna<T>[]; onChange: (items: T[]) => void; nuevo: () => T; anadir: string; quitar: string }) {
  const poner = (id: string, key: string, v: string) => onChange(items.map((x) => (x.id === id ? { ...x, [key]: v } : x)));
  return (
    <div className="lista">
      {items.length > 0 && (
        <table>
          <thead><tr>{columnas.map((c) => <th key={c.key}>{c.label}</th>)}<th /></tr></thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.id}>
                {columnas.map((c) => (
                  <td key={c.key}>
                    {c.opciones ? (
                      <select aria-label={c.label} value={String(x[c.key] ?? "")} onChange={(e) => poner(x.id, c.key, e.target.value)}>{c.opciones.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
                    ) : <input aria-label={c.label} value={String(x[c.key] ?? "")} onChange={(e) => poner(x.id, c.key, e.target.value)} />}
                  </td>
                ))}
                <td><button aria-label={quitar} title={quitar} onClick={() => onChange(items.filter((y) => y.id !== x.id))}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button onClick={() => onChange([...items, nuevo()])}>{anadir}</button>
    </div>
  );
}

// Colección con nombre guardada en el proyecto: elegir, crear, renombrar y borrar.
export function Cabecera<T extends { id: string; nombre: string }>({ items, actual, onSelect, onChange, crear, textos }: {
  items: T[]; actual?: T; onSelect: (id: string) => void; onChange: (items: T[]) => void; crear: (id: string, nombre: string) => T;
  textos: { nuevo: string; pedir: string; borrar: string; confirmar: (n: string) => string; nombre: string };
}) {
  return (
    <>
      <div className="chips">
        {items.map((x) => <button key={x.id} className={`chip ${x.id === actual?.id ? "on" : ""}`} aria-pressed={x.id === actual?.id} onClick={() => onSelect(x.id)}>{x.nombre || "—"}</button>)}
        <button onClick={async () => { const n = await ask(textos.pedir); if (!n?.trim()) return; const x = crear(crypto.randomUUID(), n.trim()); onChange([...items, x]); onSelect(x.id); }}>{textos.nuevo}</button>
      </div>
      {actual && (
        <div className="row">
          <input className="nombre" aria-label={textos.nombre} value={actual.nombre} onChange={(e) => onChange(items.map((x) => (x.id === actual.id ? { ...x, nombre: e.target.value } : x)))} />
          <span className="spacer" />
          <button onClick={async () => { if (await confirmAsk(textos.confirmar(actual.nombre))) onChange(items.filter((x) => x.id !== actual.id)); }}>{textos.borrar}</button>
        </div>
      )}
    </>
  );
}
