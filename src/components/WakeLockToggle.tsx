import { CompactToggle } from './CompactToggle'

const ICON = 'size-4'

export function MugIcon({ steam }: { steam: boolean }) {
  return (
    <svg
      className={ICON}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {steam && <path d="M8 2c0 1-1 1.5-1 2.5S8 6 8 7M12 2c0 1-1 1.5-1 2.5S12 6 12 7M16 2c0 1-1 1.5-1 2.5S16 6 16 7" />}
      <path d="M5 9h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V9z" />
      <path d="M16 10h2a2.5 2.5 0 0 1 0 5h-2" />
    </svg>
  )
}

// Lives in the recipe detail action row, next to „Abhaken“. Controlled: the page owns the lock, so the phone's
// ⋯ menu item shares its state.
export function WakeLockToggle({
  enabled,
  supported,
  toggle,
}: {
  enabled: boolean
  supported: boolean
  toggle: () => void
}) {
  if (!supported) return null

  return (
    <CompactToggle
      pressed={enabled}
      onClick={toggle}
      label="Bildschirm anlassen"
      tooltip={enabled ? 'Bildschirm bleibt an' : 'Bildschirm anlassen'}
    >
      <MugIcon steam={enabled} />
    </CompactToggle>
  )
}
