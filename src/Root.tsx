import { useState } from "react";
import App from "./App";
import { Session, Welcome } from "./Welcome";
import { idbSet } from "./store";

// Sin sesión no hay proyecto: se muestra la pantalla de inicio. `granted`: el handle guardado aún tiene permiso.
export default function Root({ initial, handle, granted }: { initial: Session["project"] | null; handle: any; granted: boolean }) {
  const [s, setS] = useState<{ project: Session["project"]; handle: any; granted: boolean; n: number } | null>(initial ? { project: initial, handle, granted, n: 0 } : null);
  const [creating, setCreating] = useState(false);
  if (!s || creating) {
    return <Welcome onCancel={s ? () => setCreating(false) : undefined} onOpen={(x) => {
      idbSet("project", x.project).catch(() => {});
      idbSet("handle", x.handle).catch(() => {});
      setS({ ...x, granted: true, n: (s?.n ?? 0) + 1 });
      setCreating(false);
    }} />;
  }
  return <App key={s.n} initial={s.project} handle={s.handle} granted={s.granted} onNew={() => setCreating(true)} />;
}
