import { useEffect, useState } from 'react'
import storkUrl from '../assets/brand/yourkly-stork.png'

/**
 * A small brand moment for real delivery milestones.
 * It never claims files moved out of GitHub: the parcel represents Yourkly
 * bringing the project into view in plain language.
 */
export default function StorkDelivery({
  variant = 'connected',
  count = 0,
  projectName = '',
  onDone,
}) {
  const [finished, setFinished] = useState(false)

  const copy = variant === 'projects'
    ? {
        title: count === 1 ? 'We found your project.' : `We found ${count} projects.`,
        body: 'They still live in GitHub. Yourkly brought them into view in plain language.',
      }
    : variant === 'created'
      ? {
          title: 'Your project is ready.',
          body: projectName
            ? `${projectName} lives in your GitHub account. Yourkly will help you make sense of it.`
            : 'It lives in your GitHub account. Yourkly will help you make sense of it.',
        }
      : {
          title: "You're connected.",
          body: "GitHub is ready behind the scenes. Let's make your first project.",
        }

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setFinished(true)
      onDone?.()
      return undefined
    }
    const timer = window.setTimeout(() => {
      setFinished(true)
      onDone?.()
    }, 2600)
    return () => window.clearTimeout(timer)
  }, [onDone])

  return (
    <div className={`stork-delivery stork-delivery--${variant}${finished ? ' stork-delivery--done' : ''}`}>
      <div className="stork-delivery-stage" aria-hidden="true">
        <div className="stork-delivery-flyer">
          <img src={storkUrl} alt="" className="stork-delivery-bird" />
          <span className="stork-delivery-parcel">
            <span className="stork-delivery-tab" />
            <span className="stork-delivery-paper" />
          </span>
        </div>
        <span className="stork-delivery-destination">
          <span className="stork-delivery-destination-tab" />
        </span>
      </div>
      <div className="stork-delivery-copy" aria-live="polite">
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
      </div>
    </div>
  )
}
