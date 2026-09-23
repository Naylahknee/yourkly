import { Link } from 'react-router-dom'
import BrandWordmark from '../components/BrandWordmark'
import { nativeProjects } from '../utils/nativeProjectStore'

export default function NativeProjects() {
  const projects=nativeProjects()
  return <div className="welcome-page"><div className="landing-shell">
    <header className="landing-header"><BrandWordmark className="brand-wordmark--landing" /><Link className="pl-btn" to="/">Home</Link></header>
    <main className="screen-padded mobile-projects">
      <div className="projects-heading-row"><div><div className="eyebrow">YOURKLY PROJECTS</div><h1>Your Projects</h1><p className="muted">No GitHub required.</p></div><Link className="pl-btn-primary" to="/native/new">+ New project</Link></div>
      {projects.length===0?<div className="projects-empty"><h2>Start your first project</h2><Link className="pl-btn-primary" to="/native/new">Create project</Link></div>:
      <div className="projects-grid">{projects.map(p=><Link className="project-card" key={p.id} to={`/native/p/${p.id}`}><div className="project-card-main"><strong>{p.name}</strong><p>{p.description||'Yourkly-managed project'}</p><span className="project-meta">Kept with Yourkly · GitHub not connected</span></div></Link>)}</div>}
    </main>
  </div></div>
}
