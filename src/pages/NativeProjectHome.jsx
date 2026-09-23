import { useMemo,useState } from 'react'
import { Link,useParams,useNavigate } from 'react-router-dom'
import BrandWordmark from '../components/BrandWordmark'
import { nativeProject,nativeFiles,nativeVersions,saveNativeFile,deleteNativeFile,createNativeVersion,restoreNativeVersion,exportNativeProject,deleteNativeProject } from '../utils/nativeProjectStore'

export default function NativeProjectHome(){
 const {id}=useParams(), navigate=useNavigate(), project=nativeProject(id)
 const [files,setFiles]=useState(()=>nativeFiles(id)), [versions,setVersions]=useState(()=>nativeVersions(id))
 const [editing,setEditing]=useState(null), [name,setName]=useState(''), [content,setContent]=useState('')
 const [tab,setTab]=useState('files')
 const changed=useMemo(()=>editing!==null,[editing])
 if(!project)return <div className="screen-padded"><p className="error-box">That project isn't on this device.</p><Link to="/native/projects">← Your Projects</Link></div>
 function openFile(f){setEditing(f);setName(f.name);setContent(f.content||'')}
 function newFile(){setEditing({id:crypto.randomUUID(),projectId:id});setName('notes.md');setContent('')}
 function save(){if(!name.trim())return; saveNativeFile(id,{...editing,name:name.trim(),content});setFiles(nativeFiles(id));setEditing(null)}
 function remove(f){if(!confirm(`Delete ${f.name}?`))return;deleteNativeFile(id,f.id);setFiles(nativeFiles(id))}
 function checkpoint(){const label=prompt('Name this Save Point','Save Point');if(label===null)return;createNativeVersion(id,label||'Save Point');setVersions(nativeVersions(id))}
 function restore(v){if(!confirm(`Restore “${v.label}”? Your current files will be replaced.`))return;restoreNativeVersion(id,v.id);setFiles(nativeFiles(id));}
 function download(){const data=exportNativeProject(id),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${project.slug||'yourkly-project'}.yourkly.json`;a.click();URL.revokeObjectURL(url)}
 function removeProject(){if(!confirm(`Delete “${project.name}” from this device?`))return;deleteNativeProject(id);navigate('/native/projects')}
 return <div className="welcome-page"><div className="landing-shell">
  <header className="landing-header"><BrandWordmark className="brand-wordmark--landing"/><Link className="pl-btn" to="/native/projects">Your Projects</Link></header>
  <main className="screen-padded project-screen native-workspace">
   <Link to="/native/projects" className="back-link">← Your Projects</Link>
   <div className="project-head"><div><div className="eyebrow">KEPT WITH YOURKLY</div><h1 className="project-title">{project.name}</h1>{project.description&&<p className="project-desc">{project.description}</p>}</div></div>
   <div className="project-status"><span className="project-status-ok">GitHub not required</span><span className="project-status-sep">|</span><span>{files.length} {files.length===1?'file':'files'}</span><span className="project-status-sep">|</span><span>{versions.length} Save {versions.length===1?'Point':'Points'}</span></div>
   <div className="native-tabs"><button className={tab==='files'?'pl-btn-primary':'pl-btn'} onClick={()=>setTab('files')}>Files</button><button className={tab==='versions'?'pl-btn-primary':'pl-btn'} onClick={()=>setTab('versions')}>Save Points</button><button className={tab==='settings'?'pl-btn-primary':'pl-btn'} onClick={()=>setTab('settings')}>Project</button></div>
   {tab==='files'&&<section className="project-update-card"><div className="projects-heading-row"><h2>Files</h2><div><button className="pl-btn" onClick={checkpoint} disabled={!files.length}>Save Point</button> <button className="pl-btn-primary" onClick={newFile}>+ New file</button></div></div>
    {!files.length?<div className="projects-empty"><p>No files yet.</p><button className="pl-btn-primary" onClick={newFile}>Create your first file</button></div>:<div className="native-file-list">{files.map(f=><div className="native-file-row" key={f.id}><button className="text-button" onClick={()=>openFile(f)}><strong>{f.name}</strong></button><button className="text-button" onClick={()=>remove(f)}>Delete</button></div>)}</div>}
   </section>}
   {tab==='versions'&&<section className="project-update-card"><div className="projects-heading-row"><h2>Save Points</h2><button className="pl-btn-primary" onClick={checkpoint} disabled={!files.length}>Make Save Point</button></div>{!versions.length?<p>No Save Points yet.</p>:versions.map((v,i)=><div className="native-file-row" key={v.id}><span><strong>{v.label}</strong><small>{new Date(v.createdAt).toLocaleString()} · {v.files.length} files</small></span><button className="pl-btn" onClick={()=>restore(v)}>Restore</button></div>)}</section>}
   {tab==='settings'&&<section className="project-update-card"><h2>Project</h2><p>This project is stored by Yourkly on this device and does not use GitHub.</p><div className="newproject-actions"><button className="pl-btn" onClick={download}>Export project</button><button className="pl-btn" onClick={removeProject}>Delete project</button></div></section>}
  </main>
  {editing&&<div className="native-editor-backdrop"><div className="native-editor"><div className="projects-heading-row"><h2>{files.some(f=>f.id===editing.id)?'Edit file':'New file'}</h2><button className="text-button" onClick={()=>setEditing(null)}>Close</button></div><label className="newproject-label">File name</label><input className="newproject-input" value={name} onChange={e=>setName(e.target.value)}/><label className="newproject-label">Contents</label><textarea className="native-editor-text" value={content} onChange={e=>setContent(e.target.value)} autoFocus/><div className="newproject-actions"><button className="pl-btn-primary" onClick={save}>Save file</button><button className="pl-btn" onClick={()=>setEditing(null)}>Cancel</button></div></div></div>}
 </div></div>
}
