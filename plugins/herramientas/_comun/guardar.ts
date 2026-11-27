// Guardar un archivo (eligiendo dónde, si el navegador o el escritorio lo permiten) .
// Devuelve el nombre con que se guardó; null si se canceló.
export async function guardar(name: string, data: BlobPart, type: string): Promise<string | null> {
  const w = window as any;
  if (w.showSaveFilePicker) {
    try {
      const h = await w.showSaveFilePicker({ suggestedName: name });
      const f = await h.createWritable();
      await f.write(new Blob([data], { type }));
      await f.close();
      return h.name;
    } catch (e: any) { if (e?.name === "AbortError") return null; throw e; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
  return name;
}

// Selector de archivo: devuelve el elegido o null.
export const elegir = (accept: string) =>
  new Promise<File | null>((res) => {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = accept;
    i.onchange = () => res(i.files?.[0] ?? null);
    i.oncancel = () => res(null);
    i.click();
  });
