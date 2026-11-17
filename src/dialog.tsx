import { useEffect, useState } from "react";
import { t } from "./i18n";

// Diálogos propios (sustituyen a prompt/confirm del navegador). Uso: await ask(...), await confirmAsk(...), await choose(...).
interface Req { msg: string; def?: string; options?: string[]; input?: boolean; res: (v: any) => void }
let push: (r: Req) => void = () => {};

export const ask = (msg: string, def = "") => new Promise<string | null>((res) => push({ msg, def, input: true, res }));
export const confirmAsk = (msg: string) => new Promise<boolean>((res) => push({ msg, res: (v) => res(!!v) }));
export const choose = (msg: string, options: string[]) => new Promise<number | null>((res) => push({ msg, options, res }));

export function DialogHost() {
  const [req, setReq] = useState<Req | null>(null);
  const [val, setVal] = useState("");
  useEffect(() => {
    push = (r) => { setReq(r); setVal(r.def ?? ""); };
    return () => { push = () => {}; };
  }, []);
  if (!req) return null;
  const cancel = req.input || req.options ? null : false;
  const close = (v: any) => { req.res(v); setReq(null); };
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && close(cancel)}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        onKeyDown={(e) => {
          if (e.key === "Escape") close(cancel);
          if (e.key === "Enter" && req.input) close(val);
        }}
      >
        <p>{req.msg}</p>
        {req.input && <input autoFocus type="text" value={val} onChange={(e) => setVal(e.target.value)} />}
        {req.options && (
          <div className="options">
            {req.options.map((o, i) => <button key={o} autoFocus={i === 0} onClick={() => close(i)}>{o}</button>)}
          </div>
        )}
        <div className="row">
          <button onClick={() => close(cancel)}>{t("d.cancel")}</button>
          {!req.options && <button className="on" autoFocus={!req.input} onClick={() => close(req.input ? val : true)}>{t("d.ok")}</button>}
        </div>
      </div>
    </div>
  );
}
