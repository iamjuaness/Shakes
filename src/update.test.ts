import assert from "node:assert/strict";
import { compareVersions, parseRelease } from "./update.ts";
import { EN, KEYS, setLang, t } from "./i18n.ts";

assert.ok(compareVersions("0.10.0", "0.9.9") > 0 && compareVersions("v1.0.0", "1.0.0") === 0 && compareVersions("0.5.0", "0.5.1") < 0);
const rel = { tag_name: "v0.6.0", html_url: "https://github.com/iamjuaness/Shakes/releases/tag/v0.6.0", body: "- algo", assets: [{ name: "Shakes_0.6.0_x64-setup.exe", browser_download_url: "https://github.com/x/y.exe" }] };
assert.equal(parseRelease(rel, "0.5.0")?.asset, "https://github.com/x/y.exe");
assert.equal(parseRelease(rel, "0.6.0"), null, "misma versión: sin aviso");
assert.equal(parseRelease({ ...rel, draft: true }, "0.5.0"), null, "borrador");
assert.equal(parseRelease({ ...rel, html_url: "http://evil" }, "0.5.0")?.page, "https://github.com/iamjuaness/Shakes/releases", "url no https de GitHub: se ignora");
assert.equal(parseRelease({ ...rel, assets: [{ name: "a.exe", browser_download_url: "http://x" }] }, "0.5.0")?.asset, undefined, "solo https");

// i18n: mismas claves y mismos marcadores {x} en ambos idiomas
const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
for (const k of KEYS) { setLang("es"); const a = t(k); assert.ok(EN[k] !== undefined, "falta en inglés: " + k); assert.equal(ph(a), ph(EN[k]), "marcadores distintos: " + k); }
setLang("en"); assert.equal(t("st.today", { n: 3 }), "Today +3");
console.log("update/i18n ok");
