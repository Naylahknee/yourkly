import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BrandWordmark from '../components/BrandWordmark'

export default function NativeJoin() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  function continueNative(e) {
    e.preventDefault()
    const profile = { name: name.trim(), email: email.trim(), createdAt: new Date().toISOString() }
    try {
      localStorage.setItem('yourkly_native_profile', JSON.stringify(profile))
      localStorage.setItem('yourkly_mode', 'native')
    } catch {}
    navigate('/native/new')
  }

  return (
    <div className="welcome-page onboarding-page mobile-flow mobile-flow--native">
      <div className="onboarding-shell">
        <header className="landing-header"><BrandWordmark className="brand-wordmark--landing" /><Link className="landing-signin" to="/">Back</Link></header>
        <div className="onboarding-progress"><span>YOURKLY · 1 OF 2</span><i><b /></i></div>
        <h1>Create your Yourkly space</h1>
        <p className="onboarding-lead">No GitHub account required. Start with Yourkly and connect GitHub later only if you want to.</p>
        <form className="newproject-form" onSubmit={continueNative}>
          <div><label className="newproject-label" htmlFor="native-name">What should we call you?</label><input id="native-name" className="newproject-input" value={name} onChange={e=>setName(e.target.value)} required autoFocus /></div>
          <div><label className="newproject-label" htmlFor="native-email">Email</label><input id="native-email" className="newproject-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
          <p className="newproject-hint">This starts a local Yourkly workspace on this device while the secure cloud account layer is connected. Don't use it yet for your only copy of important files.</p>
          <button className="landing-cta" type="submit">Continue</button>
        </form>
      </div>
    </div>
  )
}
