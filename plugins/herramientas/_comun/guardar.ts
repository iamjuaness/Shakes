// Descargar un archivo o abrir el diálogo de impresión con un HTML.
export function guardar(name: string, data: BlobPart, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function imprimir(html: string) {
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed;width:0;height:0;border:0";
  f.srcdoc = html;
  f.onload = () => { f.contentWindow?.focus(); f.contentWindow?.print(); setTimeout(() => f.remove(), 60_000); };
  document.body.appendChild(f);
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
