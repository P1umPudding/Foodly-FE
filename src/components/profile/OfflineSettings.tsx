// The profile's „Offline“ section (Phase 8, O1): the per-device settings, the space Foodly's offline store takes
// and „Cache leeren“. Nothing downloads yet, so the store stays empty and the limit isn't enforced until the sync
// lands (#355 ff.); the choices are kept so it can start from them.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  Slider,
  Spinner,
  Switch,
  cn,
} from '@postxl/ui-components'
import {
  clearOfflineStore,
  isOfflineStoreAvailable,
  LIMIT_MAX_MB,
  LIMIT_MIN_MB,
  LIMIT_STEP_MB,
  offlineUsageBytes,
} from '../../api/offline'
import type { ImageMode, Transfer } from '../../api/offline'
import { useOfflineSettings } from '../../hooks/useOfflineSettings'
import { errorMessage } from '../../lib/errorMessage'
import { ROW_DIVIDER } from '../rowDivider'
import { Segment } from '../list/Segment'

const CARD = 'mb-5 gap-0 px-1 py-0.5'
const ROW = cn('flex items-center gap-3.5 rounded-md p-3', ROW_DIVIDER)
const SEGMENT_ROW = cn(ROW, 'flex-wrap gap-y-2')
const LABEL = 'min-w-0 flex-1 font-medium'
const SECTION_HEADING = 'mb-2 text-xs font-semibold text-subtle-foreground'
const SEGMENT_ITEM = 'h-8 touch:h-10'

const TRANSFER_OPTIONS: { value: Transfer; label: string }[] = [
  { value: 'wifi', label: 'Nur WLAN' },
  { value: 'mobile', label: 'Auch mobil' },
]
const IMAGE_OPTIONS: { value: ImageMode; label: string }[] = [
  { value: 'off', label: 'Aus' },
  { value: 'wifi', label: 'Nur WLAN' },
  { value: 'always', label: 'Immer' },
]

const decimal = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })

export function formatMb(mb: number): string {
  return mb < 1000 ? `${decimal.format(mb)} MB` : `${decimal.format(mb / 1000)} GB`
}

// Below 0.05 MB the store isn't empty, it just rounds to 0.
function formatUsage(usage: Usage): string {
  if (usage === null) return '…'
  if (usage === 'unavailable') return 'nicht verfügbar'
  if (usage > 0 && usage < 50_000) return '< 0,1 MB'
  return formatMb(usage / 1_000_000)
}

// null while loading, 'unavailable' without IndexedDB (e.g. some private modes) or when it fails.
type Usage = number | null | 'unavailable'

function useOfflineUsage() {
  const [usage, setUsage] = useState<Usage>(isOfflineStoreAvailable() ? null : 'unavailable')
  const [version, setVersion] = useState(0)
  useEffect(() => {
    if (!isOfflineStoreAvailable()) return
    let live = true
    offlineUsageBytes().then(
      (bytes) => live && setUsage(bytes),
      () => live && setUsage('unavailable'),
    )
    return () => {
      live = false
    }
  }, [version])
  return [usage, () => setVersion((v) => v + 1)] as const
}

export function OfflineSettings() {
  const [settings, update] = useOfflineSettings()
  // The slider shows its value while dragging; it is saved once, on release.
  const [limitDraft, setLimitDraft] = useState(settings.limitMb)
  const [usage, refreshUsage] = useOfflineUsage()
  const sliderBoxRef = useRef<HTMLDivElement>(null)
  // The postxl Slider forwards no aria props to its thumb (see DurationFilter), so name and value text go onto the
  // DOM node directly, before paint.
  useLayoutEffect(() => {
    const thumb = sliderBoxRef.current?.querySelector('[role=slider]')
    thumb?.setAttribute('aria-labelledby', 'offline-limit')
    thumb?.setAttribute('aria-valuetext', formatMb(limitDraft))
  }, [limitDraft])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const off = !settings.enabled

  return (
    <section aria-labelledby="profile-offline">
      <h2 id="profile-offline" className={SECTION_HEADING}>
        Offline
      </h2>
      <Card className={CARD}>
        <div className={ROW}>
          <span id="offline-mode" className={LABEL}>
            Offline-Modus
          </span>
          <Switch
            aria-labelledby="offline-mode"
            checked={settings.enabled}
            onCheckedChange={(enabled) => update({ enabled })}
          />
        </div>
        <div className={SEGMENT_ROW}>
          <span id="offline-download" className={LABEL}>
            Laden
          </span>
          <Segment<Transfer>
            value={settings.download}
            onChange={(download) => update({ download })}
            options={TRANSFER_OPTIONS}
            withLabels
            disabled={off}
            itemClassName={SEGMENT_ITEM}
            aria-labelledby="offline-download"
          />
        </div>
        <div className={SEGMENT_ROW}>
          <span id="offline-upload" className={LABEL}>
            Hochladen
          </span>
          <Segment<Transfer>
            value={settings.upload}
            onChange={(upload) => update({ upload })}
            options={TRANSFER_OPTIONS}
            withLabels
            disabled={off}
            itemClassName={SEGMENT_ITEM}
            aria-labelledby="offline-upload"
          />
        </div>
        <div className={SEGMENT_ROW}>
          <span id="offline-images" className={LABEL}>
            Bilder speichern
          </span>
          <Segment<ImageMode>
            value={settings.images}
            onChange={(images) => update({ images })}
            options={IMAGE_OPTIONS}
            withLabels
            disabled={off}
            itemClassName={SEGMENT_ITEM}
            aria-labelledby="offline-images"
          />
        </div>
        <div className={cn(ROW, 'flex-col items-stretch gap-2')}>
          <div className="flex items-center gap-3.5">
            <span id="offline-limit" className={LABEL}>
              Speicher-Limit
            </span>
            <span className="text-muted-foreground tabular-nums">{formatMb(limitDraft)}</span>
          </div>
          {/* px: room for the knob's hover ring at both ends (as in the duration filter). */}
          <div ref={sliderBoxRef} className="px-2">
            <Slider
              aria-labelledby="offline-limit"
              sliderVariant="gray"
              min={LIMIT_MIN_MB}
              max={LIMIT_MAX_MB}
              step={LIMIT_STEP_MB}
              disabled={off}
              value={[limitDraft]}
              onValueChange={([v]) => setLimitDraft(v)}
              onValueCommit={([v]) => update({ limitMb: v })}
            />
          </div>
        </div>
        <div className={cn(ROW, 'flex-wrap gap-y-2')}>
          <span className={LABEL}>Belegter Speicher</span>
          <span className="text-muted-foreground tabular-nums" data-testid="offline-usage">
            {formatUsage(usage)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!isOfflineStoreAvailable()}
            onClick={() => setConfirmOpen(true)}
          >
            Cache leeren
          </Button>
        </div>
      </Card>
      <ClearCacheDialog open={confirmOpen} onOpenChange={setConfirmOpen} onCleared={refreshUsage} />
    </section>
  )
}

function ClearCacheDialog({
  open,
  onOpenChange,
  onCleared,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCleared: () => void
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onConfirm = async () => {
    if (pending) return
    setPending(true)
    setError(null)
    try {
      await clearOfflineStore()
      onCleared()
      onOpenChange(false)
    } catch (e) {
      setError(errorMessage(e, 'Leeren fehlgeschlagen'))
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        if (!next) setError(null)
        onOpenChange(next)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cache leeren?</AlertDialogTitle>
          <AlertDialogDescription>
            Alle offline gespeicherten Rezepte und Bilder werden von diesem Gerät gelöscht. Die Einstellungen bleiben.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Abbrechen</AlertDialogCancel>
          {/* As in DeleteRecipeDialog: a plain Button keeps the dialog open for an error, aria-disabled keeps
              focus. */}
          <Button
            variant="destructive"
            onClick={() => void onConfirm()}
            aria-disabled={pending}
            className="gap-1.5 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            {pending && <Spinner className="size-4" />}
            Leeren
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
