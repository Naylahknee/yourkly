import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BrandWordmark from './BrandWordmark'

export default function NativeHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const updateScroll = () => setScrolled(window.scrollY > 8)
    updateScroll()
    window.addEventListener('scroll', updateScroll, { passive: true })
    return () => window.removeEventListener('scroll', updateScroll)
  }, [])

  return (
    <header className={`native-menu-header${scrolled ? ' native-menu-header--scrolled' : ''}`}>
      <div className="native-menu-inner">
        <Link className="native-menu-brand" to="/" aria-label="Yourkly home">
          <BrandWordmark className="brand-wordmark--landing" />
        </Link>
        <nav aria-label="Main navigation">
          <Link to="/">Home</Link>
          <Link to="/native/projects">My Projects</Link>
        </nav>
      </div>
    </header>
  )
}
