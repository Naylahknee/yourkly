import { Link, useNavigate } from 'react-router-dom'
import BrandWordmark from '../components/BrandWordmark'

export default function NativeJoin() {
  const navigate=useNavigate()
  return <div className="welcome-page onboarding-page mobile-flow mobile-flow--native"><div className="onboarding-shell">
    <header className="landing-header"><BrandWordmark className="brand-wordmark--landing"/><Link className="landing-signin" to="/">Back</Link></header>
    <div className="onboarding-progress"><span>YOURKLY PROJECTS</span><i><b className="onboarding-progress--two"/></i></div>
    <h1>Use Yourkly without GitHub</h1>
    <p className="onboarding-lead">Create projects, files, and Save Points without a GitHub account.</p>
    <div className="onboarding-checklist"><div><strong>Your project</strong><small>Use normal project language, not GitHub vocabulary.</small></div><div><strong>Your versions</strong><small>Make Save Points before a big change and restore them later.</small></div><div><strong>Your exit</strong><small>Export the complete project whenever you want.</small></div></div>
    <p className="newproject-hint">For this first native release, Yourkly keeps this workspace in this browser on this device. It does not upload these projects to GitHub.</p>
    <button className="landing-cta" type="button" onClick={()=>{try{localStorage.setItem('yourkly_mode','native')}catch{};navigate('/native/projects')}}>Start with Yourkly</button>
  </div></div>
}
