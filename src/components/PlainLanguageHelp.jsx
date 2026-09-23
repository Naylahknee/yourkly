import { useState } from 'react'
import { YOURKLY_TERMS } from '../utils/language'

const ROWS=['repository','commit','branch','pullRequest','merge','readme','gitignore','license']

export default function PlainLanguageHelp({ compact=false }){
 const [open,setOpen]=useState(false)
 if(!open)return <button type="button" className="plain-help-trigger" onClick={()=>setOpen(true)}>What do these words mean?</button>
 return <section className={compact?'plain-help plain-help--compact':'plain-help'}>
  <div className="plain-help-head"><div><strong>Yourkly words</strong><p>You do not need to learn GitHub language to use Yourkly.</p></div><button className="text-button" onClick={()=>setOpen(false)}>Close</button></div>
  <div className="plain-help-list">{ROWS.map(k=>{const t=YOURKLY_TERMS[k];return <div className="plain-help-row" key={k}><div><strong>{t.label}</strong><small>GitHub calls this: {t.github}</small></div><p>{t.help}</p></div>})}</div>
 </section>
}
