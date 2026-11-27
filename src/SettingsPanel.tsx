import { useEffect, useState } from "react";
import { t } from "./i18n";
import type { Lang } from "./i18n";
import { getBackupDir, getProjectsDir, saveSettings, setBackupDir, setProjectsDir, useSettings } from "./settings";
import { Update, checkUpdate, openUpdate } from "./update";
import { confirmAsk } from "./dialog";
import changelog from "../CHANGELOG.md?raw";
import { version } from "../package.json";

const w = window as any;
export const APP_VERSION: string = version;
const actualizar = (u: Update) => openUpdate(u, () => confirmAsk(t("up.confirm", { v: u.version })));

// Aviso de versión nueva: se muestra arriba en todas las pantallas. «Actualizar» descarga el instalador de la release.
export function UpdateBar({ update, onHide, onNotes }: { update: Update; onHide: () => void; onNotes: () => void }) {
  return (
    <div className="updatebar" role="status">
      <span>{t("up.available", { v: update.version, cur: APP_VERSION })} <span className="muted">{t("up.hint")}</span></span>
      <span className="spacer" />
      <button className="on" onClick={() => actualizar(update)}>{update.asset ? t("up.update") : t("up.noAsset")}</button>
      <button onClick={onNotes}>{t("up.notes")}</button>
      <button onClick={onHide}>{t("up.later")}</button>
    </div>
  );
}

export function SettingsPanel({ update, onUpdate }: { update: Update | null; onUpdate: (u: Update | null) => void }) {
  const s = useSettings();
  const [dir, setDir] = useState<any>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { getProjectsDir().then((d) => setDir(d ?? null)); }, []);
  const [copias, setCopias] = useState<any>(null);
  useEffect(() => { getBackupDir().then((d) => setCopias(d ?? null)); }, []);
  async function pickCopias() {
    try { const d = await w.showDirectoryPicker({ mode: "readwrite", startIn: copias ?? "documents" }); await setBackupDir(d); setCopias(d); } catch { /* cancelado */ }
  }

  async function pick() {
    try { const d = await w.showDirectoryPicker({ mode: "readwrite", startIn: dir ?? "documents" }); await setProjectsDir(d); setDir(d); } catch { /* cancelado */ }
  }
  async function check() {
    setMsg(t("set.checking"));
    try { const u = await checkUpdate(APP_VERSION); onUpdate(u); setMsg(u ? t("up.available", { v: u.version, cur: APP_VERSION }) : t("set.upToDate")); }
    catch (e: any) { setMsg(t("set.checkFail", { e: e?.message ?? String(e) })); }
  }
  return (
    <div className="panel settings">
      <h3>{t("set.general")}</h3>
      <label className="srow">{t("set.lang")}
        <select value={s.lang} onChange={(e) => saveSettings({ lang: e.target.value as Lang })}>
          <option value="es">Español</option><option value="en">English</option>
        </select>
      </label>
      <label className="srow">{t("set.theme")}
        <select value={s.theme} onChange={(e) => saveSettings({ theme: e.target.value as typeof s.theme })}>
          <option value="auto">{t("set.theme.auto")}</option><option value="light">{t("set.theme.light")}</option><option value="dark">{t("set.theme.dark")}</option>
        </select>
      </label>

      <h3>{t("set.writing")}</h3>
      <label className="check"><input type="checkbox" checked={s.spell} onChange={(e) => saveSettings({ spell: e.target.checked })} /> {t("set.spell")}</label>
      <p className="muted">{t("set.spell.hint")}</p>
      <label className="srow">{t("set.font")}
        <select value={s.fontSize} onChange={(e) => saveSettings({ fontSize: Number(e.target.value) })}>
          {[15, 17, 19, 21, 23, 26].map((n) => <option key={n} value={n}>{n} px</option>)}
        </select>
      </label>
      <label className="srow">{t("set.width")}
        <select value={s.width} onChange={(e) => saveSettings({ width: Number(e.target.value) })}>
          <option value={560}>{t("set.width.n")}</option><option value={700}>{t("set.width.m")}</option><option value={900}>{t("set.width.w")}</option>
        </select>
      </label>

      <h3>{t("set.projects")}</h3>
      <div className="srow">
        <span>{t("set.dir")}</span>
        <span className="row">
          <strong>{dir ? dir.name : t("set.dir.none")}</strong>
          {w.showDirectoryPicker ? <>
            <button onClick={pick}>{t("set.dir.pick")}</button>
            {dir && <button onClick={() => setProjectsDir(null).then(() => setDir(null))}>{t("set.dir.clear")}</button>}
          </> : <span className="muted">{t("set.dir.unsupported")}</span>}
        </span>
      </div>

      <h3>{t("set.saving")}</h3>
      <label className="srow">{t("set.copy")}
        <select value={s.copyMinutes} onChange={(e) => saveSettings({ copyMinutes: Number(e.target.value) })}>
          <option value={0}>{t("set.copy.off")}</option>
          {[5, 10, 30, 60].map((n) => <option key={n} value={n}>{t("set.copy.min", { n })}</option>)}
        </select>
      </label>
      <p className="muted">{t("set.copy.hint")}</p>
      <div className="srow">
        <span>{t("set.backup")}</span>
        <span className="row">
          <strong>{copias ? copias.name : t("set.backup.none")}</strong>
          {w.showDirectoryPicker ? <>
            <button onClick={pickCopias}>{t("set.dir.pick")}</button>
            {copias && <button onClick={() => setBackupDir(null).then(() => setCopias(null))}>{t("set.dir.clear")}</button>}
          </> : <span className="muted">{t("set.dir.unsupported")}</span>}
        </span>
      </div>
      <p className="muted">{t("set.backup.hint")}</p>

      <h3>{t("set.updates")}</h3>
      <label className="check"><input type="checkbox" checked={s.checkUpdates} onChange={(e) => saveSettings({ checkUpdates: e.target.checked })} /> {t("set.checkStart")}</label>
      <div className="row">
        <span>{t("set.version", { v: APP_VERSION })}</span>
        <button onClick={check}>{t("set.checkNow")}</button>
        {update && <button className="on" onClick={() => actualizar(update)}>{t("up.update")} {update.version}</button>}
      </div>
      {msg && <p className="muted">{msg}</p>}

      <h3>{t("set.changelog")}</h3>
      {update?.notes && <pre className="changelog">{update.notes}</pre>}
      <pre className="changelog">{changelog}</pre>
    </div>
  );
}
