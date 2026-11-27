// Guardado en archivo: escrituras en serie, sin pisar cambios hechos fuera (otro equipo, la nube) y copias diarias
// en otra carpeta. Test: node src/guardado.test.ts
import { safeName } from "./newProject.ts";
import type { Project } from "./tree.ts";

// Fecha de modificación del archivo. undefined: el sistema no la da (no se puede detectar un cambio externo).
export const marca = async (h: any): Promise<number | undefined> => (await h.getFile()).lastModified;

async function escribir(h: any, p: Project) {
  const f = await h.createWritable();
  await f.write(JSON.stringify(p));
  await f.close();
}

export type Guardador = ReturnType<typeof guardador>;
// `previo`: la fecha que tenía el archivo la última vez que Shakes lo escribió (de otra sesión). Sin ella se toma la
// actual. `anotar` recibe la nueva fecha tras cada escritura.
export function guardador(h: any, previo?: number | Promise<number | undefined>, anotar: (m?: number) => void = () => {}) {
  let visto: number | undefined;
  let cola: Promise<unknown> = Promise.resolve(previo)
    .then(async (v) => { visto = v ?? (await marca(h)); })
    .catch(() => {});
  return {
    h,
    // false: el archivo cambió fuera de Shakes y no se ha escrito (salvo `forzar`).
    guardar(p: Project, forzar = false): Promise<boolean> {
      const r = cola.then(async () => {
        const ahora = await marca(h).catch(() => undefined);
        if (!forzar && visto !== undefined && ahora !== undefined && ahora !== visto) return false;
        await escribir(h, p);
        visto = await marca(h).catch(() => undefined);
        anotar(visto);
        return true;
      });
      cola = r.catch(() => {});
      return r;
    },
  };
}

// Una copia por día en la carpeta de copias (la del mismo día se actualiza). Nunca se borra ninguna.
export const nombreCopia = (titulo: string, dia: string) => `${safeName(titulo) || "Shakes"} ${dia}.shks`;
export async function copiaEn(dir: any, p: Project, dia: string): Promise<void> {
  await escribir(await dir.getFileHandle(nombreCopia(p.book.title, dia), { create: true }), p);
}
