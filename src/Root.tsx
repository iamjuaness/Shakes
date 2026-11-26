import { useEffect, useState } from "react";
import App from "./App";
import { Session, Welcome } from "./Welcome";
import { idbSet, recentAdd } from "./store";
import { APP_VERSION, UpdateBar } from "./SettingsPanel";
import { Update, checkUpdate } from "./update";
import { useSettings } from "./settings";
import { t } from "./i18n";

// Sin sesión no hay proyecto: se muestra la pantalla de inicio. `granted`: el handle guardado aún tiene permiso.
export default function Root({ initial, handle, granted }: { initial: Session["project"] | null; handle: any; granted: boolean }) {
  const settings = useSettings(); // re-renderiza toda la app al cambiar idioma o tema
  const [s, setS] = useState<{ project: Session["project"]; handle: any; granted: boolean; n: number } | null>(initial ? { project: initial, handle, granted, n: 0 } : null);
  const [creating, setCreating] = useState(false);
  const [update, setUpdate] = useState<Update | null>(null);
  const [hidden, setHidden] = useState(false);
  const [notes, setNotes] = useState(false);
  useEffect(() => { if (settings.checkUpdates) checkUpdate(APP_VERSION).then(setUpdate).catch(() => {}); }, [settings.checkUpdates]); // sin red: en silencio
  const bar = update && !hidden && (
    <>
      <UpdateBar update={update} onHide={() => setHidden(true)} onNotes={() => setNotes((v) => !v)} />
      {notes && <div className="updatenotes"><pre className="changelog">{update.notes || t("up.notes")}</pre></div>}
    </>
  );
  // Con «Nuevo» la App queda montada (oculta) debajo de la pantalla de inicio: al volver sigue igual. Antes se desmontaba
  // y al volver se recreaba con el proyecto de cuando se abrió, y el autoguardado pisaba el archivo con esa copia vieja.
  return <>
    {bar}
    {(!s || creating) && <Welcome update={update} onUpdate={setUpdate} onCancel={s ? () => setCreating(false) : undefined} onOpen={(x) => {
      idbSet("project", x.project).catch(() => {});
      idbSet("handle", x.handle).catch(() => {});
      recentAdd(x.handle);
      setS({ ...x, granted: true, n: (s?.n ?? 0) + 1 });
      setCreating(false);
    }} />}
    {s && <div style={{ display: creating ? "none" : "contents" }}>
      <App key={s.n} hidden={creating} initial={s.project} handle={s.handle} granted={s.granted} update={update} onUpdate={setUpdate} onNew={() => setCreating(true)} onClose={() => { idbSet("project", null).catch(() => {}); idbSet("handle", null).catch(() => {}); setS(null); }} />
    </div>}
  </>;
}
