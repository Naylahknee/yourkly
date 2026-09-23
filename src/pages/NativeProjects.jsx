import { Link } from 'react-router-dom'
import BrandWordmark from '../components/BrandWordmark'

export default function NativeProjects() {
  let projects = []
  try { projects = JSON.parse(localStorage.getItem('yourkly_native_projects') || '[]') } catch {}

  return <div className="welcome-page"><div className="landing-shell">
    <header className="landing-header"><BrandWordmark className="brand-wordmark--landing" /><Link className="pl-btn" to="/">Home</Link></header>
    <main className="screen-padded mobile-projects">
      <div className="projects-heading-row"><div><div className="eyebrow">YOURKLY PROJECTS</div><h1>Your Projects</h1><p className="muted">These projects do not require GitHub.</p></div><Link className="pl-btn-primary" to="/native/new">+ New project</Link></div>
      {projects.length === 0 ? <div className="projects-empty"><h2>Start your first project</h2><Link className="pl-btn-primary" to="/native/new">Create project</Link></div> :
      <div className="projects-grid">{projects.map(p=><article className="project-card" key={p.id}><div className="project-card-main"><strong>{p.name}</strong><p>{p.description || 'Yourkly-managed project'}</p><span className="project-meta">Kept with Yourkly · GitHub not connected</span></div></article>)}</div>}
      <p className="newproject-hint">Foundation preview: project metadata is currently stored on this device. Cloud file storage, secure account authentication, and version snapshots are the next backend layer and are not being represented as complete yet.</p>
    </main>
  </div></div>
}
