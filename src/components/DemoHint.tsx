import { FlaskConical } from 'lucide-react'
import { isStubbed, type StubFeature } from '../api/stubs'

// Marks a feature that runs on a REST-mode stub (ADR 0003 §4). Renders nothing
// once the backend serves the feature, or with VITE_MOCK=1.
const TEXT: Partial<Record<StubFeature, string>> = {
  ratings: 'Demo: nur in diesem Browser gespeichert',
}

export function DemoHint({ feature }: { feature: StubFeature }) {
  if (!isStubbed(feature)) return null
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {TEXT[feature] ?? 'Demo: wird noch nicht gespeichert'}
    </p>
  )
}
