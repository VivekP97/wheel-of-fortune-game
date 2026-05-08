interface SolveOutcomeBannerProps {
  variant: 'success' | 'error'
  message: string
  onDismiss: () => void
}

export default function SolveOutcomeBanner({
  variant,
  message,
  onDismiss,
}: SolveOutcomeBannerProps) {
  return (
    <div
      className={`solve-outcome-banner solve-outcome-banner--${variant}`}
      role="status"
    >
      <p className="solve-outcome-banner-text">{message}</p>
      <button
        type="button"
        className="solve-outcome-banner-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        Dismiss
      </button>
    </div>
  )
}
