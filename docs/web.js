// Web de Shakes: botones de descarga con la última versión publicada en GitHub y el índice activo de los tutoriales.
// Sin dependencias. Si la API de GitHub no responde, los botones apuntan a la página de versiones.
const REPO = "iamjuaness/Shakes";
const RELEASES = `https://github.com/${REPO}/releases/latest`;

async function ultimaVersion() {
  const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } });
  if (!r.ok) throw new Error(String(r.status));
  const j = await r.json();
  const exe = (j.assets || []).find((a) => /\.exe$/i.test(a.name));
  return { version: String(j.tag_name || "").replace(/^v/, ""), url: exe ? exe.browser_download_url : j.html_url || RELEASES, mb: exe ? (exe.size / 1048576).toFixed(1) : null, fecha: j.published_at };
}

ultimaVersion().then((v) => {
  document.querySelectorAll("[data-descarga]").forEach((a) => { a.href = v.url; });
  const f = v.fecha ? new Date(v.fecha).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" }) : "";
  document.querySelectorAll("[data-version]").forEach((e) => { e.textContent = `Versión ${v.version}${v.mb ? ` · ${v.mb} MB` : ""}${f ? ` · ${f}` : ""} · Windows 10 y 11`; });
}).catch(() => {
  document.querySelectorAll("[data-descarga]").forEach((a) => { a.href = RELEASES; });
});

// Tutoriales: marca en el índice la sección que se está leyendo.
const enlaces = [...document.querySelectorAll(".indice a")];
if (enlaces.length && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) enlaces.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === `#${e.target.id}`));
  }, { rootMargin: "-20% 0px -70% 0px" });
  document.querySelectorAll(".doc article section[id]").forEach((s) => io.observe(s));
}
