import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BrandWordmark from '../components/BrandWordmark'
import { createNativeProject } from '../utils/nativeProjectStore'

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64)
}

export default function NativeNewProject() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  function create(e) {
    e.preventDefault()
    const project = createNativeProject({ name, slug: slugify(name), description })
    navigate(`/native/p/${project.id}`)
  }

  return <div className="welcome-page onboarding-page mobile-flow mobile-flow--native"><div className="onboarding-shell">
    <header className="landing-header"><BrandWordmark className="brand-wordmark--landing" /></header>
    <div className="onboarding-progress"><span>YOURKLY · 2 OF 2</span><i><b className="onboarding-progress--two" /></i></div>
    <h1>Make your first project</h1>
    <p className="onboarding-lead">Call it what you call it. Yourkly handles the technical structure.</p>
    <form className="newproject-form" onSubmit={create}>
      <div><label className="newproject-label" htmlFor="native-project-name">What should it be called?</label><input id="native-project-name" className="newproject-input" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. My homeschool planner" required autoFocus /></div>
      <div><label className="newproject-label" htmlFor="native-project-desc">What are you building?</label><input id="native-project-desc" className="newproject-input" value={description} onChange={e=>setDescription(e.target.value)} placeholder="One sentence is enough" /></div>
      <button className="landing-cta" type="submit">Create my project</button>
    </form>
  </div></div>
}
