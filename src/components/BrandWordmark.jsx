import wordmarkUrl from '../assets/brand/yourkly-wordmark.png'
import storkUrl from '../assets/brand/yourkly-stork.png'

export default function BrandWordmark({ className = '' }) {
  return (
    <span className={`brand-lockup ${className}`.trim()} aria-label="Yourkly">
      <span className="brand-stork-crop" aria-hidden="true">
        <img src={storkUrl} alt="" />
      </span>
      <img className="brand-wordmark" src={wordmarkUrl} alt="" aria-hidden="true" />
    </span>
  )
}
