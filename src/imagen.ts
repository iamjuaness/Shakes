// Imágenes que se guardan dentro del proyecto: se reducen y se pasan a JPEG (lo que admite el PDF).
export async function reducir(file: Blob, max: number): Promise<{ url: string; w: number; h: number }> {
  const img = new Image();
  img.src = URL.createObjectURL(file);
  try {
    await img.decode();
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * s), h = Math.round(img.height * s);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d")!;
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); // PNG con transparencia: fondo blanco
    g.drawImage(img, 0, 0, w, h);
    return { url: c.toDataURL("image/jpeg", 0.85), w, h };
  } finally { URL.revokeObjectURL(img.src); }
}

// Abre el selector de imágenes. null si se cancela; lanza si la imagen es ilegible.
export const elegirImagen = (max: number) => new Promise<Awaited<ReturnType<typeof reducir>> & { nombre: string } | null>((res, rej) => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.oncancel = () => res(null);
  input.onchange = () => {
    const f = input.files?.[0];
    if (!f) return res(null);
    reducir(f, max).then((r) => res({ ...r, nombre: f.name.replace(/\.\w+$/, "") }), rej);
  };
  input.click();
});
