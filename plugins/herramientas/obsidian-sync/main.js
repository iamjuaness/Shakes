Object.defineProperty(exports,Symbol.toStringTag,{value:`Module`});let e=require("shakes/tree");const t={character:`Personaje`,place:`Lugar`,object:`Objeto`,faction:`Facción`},n=e=>(e.replace(/[\\/:*?"<>|#^[\]]/g,`-`).trim()||`Sin nombre`)+`.md`,r=e=>[[[`Edad`,e.age],[`Ocupación`,e.job],[`Origen`,e.origin]].filter(([,e])=>e).map(([e,t])=>`**${e}:** ${t}`).join(`  
`),...[[`Virtudes`,e.virtues],[`Defecto central`,e.flaw],[`Trasfondo`,e.backstory],[`Mentira que se cree`,e.lie],[`Arco de cambio`,e.arc],[`Rasgo inspirador`,e.trait]].filter(([,e])=>e?.trim()).map(([e,t])=>`### ${e}\n${t.trim()}`)].filter(Boolean).join(`

`);function i(e,n,i){let a=(e.links??[]).flatMap(e=>{let t=n.find(t=>t.id===e.to);return t?[`- ${e.label}: [[${t.name}]]`]:[]});return[`---\ntipo: ${t[e.type]??e.type}\nfuente: Shakes\n---`,`# ${e.name}`,e.type===`character`?r(e):``,e.notes.trim(),a.length?`## Relaciones\n${a.join(`
`)}`:``,i.length?`## Aparece en\n${i.map(e=>`- ${e}`).join(`
`)}`:``].filter(Boolean).join(`

`)+`
`}const a={id:`obsidian-sync`,name:`Sincronizar con Obsidian`,actions:[{label:`Volcar fichas a una carpeta (Obsidian)…`,async run(t){let r=window.showDirectoryPicker;if(!r)return t.notify(`⚠ Este navegador no permite elegir carpetas.`);try{let a=await r({mode:`readwrite`});for(let r of t.cards){let o=await(await a.getFileHandle(n(r.name),{create:!0})).createWritable();await o.write(i(r,t.cards,(0,e.mentions)(t.project.book,r.name,r.alias).map(e=>e.scene.title))),await o.close()}t.notify(`${t.cards.length} fichas escritas en «${a.name}»`)}catch{}}}]};exports.obsidianSync=a;