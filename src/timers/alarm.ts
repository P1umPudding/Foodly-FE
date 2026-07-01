// Best-effort kitchen-timer alarm: a repeating rhythmic WebAudio beep phrase plus
// vibration, per timer id so several alarms can coexist. No React, no audio asset.
//
// The AudioContext is created/resumed ONLY from a user gesture via unlockAudio()
// (creating one outside a gesture warns in the console). startAlarm() never
// creates a context — if none is unlocked it silently skips the sound and the
// visual/toast/vibration channels still fire.

let ctx: AudioContext | null = null

type ActiveAlarm = {
  beep: ReturnType<typeof setInterval>
  safety: ReturnType<typeof setTimeout>
  // Live oscillator nodes for this alarm. The phrase is scheduled ahead of time
  // via WebAudio, so we keep handles to silence any queued blips the instant the
  // user hits Stopp — otherwise the current phrase would play out its tail.
  oscs: Set<OscillatorNode>
}
const active = new Map<string, ActiveAlarm>()

// Rhythmic alarm phrase so it pulses "faster then slower" instead of a flat
// metronome. Each symbol is one blip; '.' = short gap after it, '-' = long gap.
// A blip that starts a new group (the first one, or any right after a long gap)
// gets an accent pitch — so the ear hears a "DUM-da-da DUM-da" cadence.
const RHYTHM = '.-..-..-.-'
const BEEP_DUR = 0.09
const SHORT_GAP = 0.13
const LONG_GAP = 0.33
const PHRASE_REST = 0.45 // trailing silence before the phrase repeats
const FREQ_BASE = 784 // G5
const FREQ_ACCENT = 1047 // C6

const PHRASE_MS = Math.round(
  ([...RHYTHM].reduce((t, sym) => t + BEEP_DUR + (sym === '-' ? LONG_GAP : SHORT_GAP), 0) + PHRASE_REST) * 1000,
)

const VIBRATE_PATTERN = [200, 100, 200, 100, 200]
const SAFETY_STOP_MS = 60_000

export function unlockAudio(): void {
  try {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    if (!ctx) ctx = new Ctor()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    // Audio unavailable — alarms stay silent, everything else still works.
  }
}

function blipAt(at: number, freq: number): OscillatorNode | null {
  if (!ctx) return null
  const start = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  // Short envelope to avoid clicks.
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.3, start + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + BEEP_DUR)
  osc.connect(gain).connect(ctx.destination)
  osc.start(start)
  osc.stop(start + BEEP_DUR + 0.02)
  return osc
}

// Schedule one rhythmic phrase from now. WebAudio plays it at precise offsets so
// the cadence stays tight regardless of timer-callback jitter. Each scheduled
// node is tracked on the alarm so Stopp can silence the queue immediately.
function playPhrase(alarm: ActiveAlarm): void {
  if (!ctx || ctx.state !== 'running') return
  try {
    let at = 0
    let accent = true // first blip, and any after a long gap, is accented
    for (const sym of RHYTHM) {
      const osc = blipAt(at, accent ? FREQ_ACCENT : FREQ_BASE)
      if (osc) {
        alarm.oscs.add(osc)
        osc.onended = () => alarm.oscs.delete(osc)
      }
      const long = sym === '-'
      at += BEEP_DUR + (long ? LONG_GAP : SHORT_GAP)
      accent = long
    }
  } catch {
    // Ignore — best-effort.
  }
}

// `onAutoStop` lets the caller clear its own alarm UI (blink/toast) when the 60 s
// safety stop fires, so the visual and the sound end together.
export function startAlarm(id: string, onAutoStop?: () => void): void {
  if (active.has(id)) return

  const alarm: ActiveAlarm = {
    beep: 0 as ReturnType<typeof setInterval>,
    safety: 0 as ReturnType<typeof setTimeout>,
    oscs: new Set(),
  }
  active.set(id, alarm)

  playPhrase(alarm)
  navigator.vibrate?.(VIBRATE_PATTERN)

  alarm.beep = setInterval(() => {
    playPhrase(alarm)
    navigator.vibrate?.(VIBRATE_PATTERN)
  }, PHRASE_MS)
  alarm.safety = setTimeout(() => {
    stopAlarm(id)
    onAutoStop?.()
  }, SAFETY_STOP_MS)
}

export function stopAlarm(id: string): void {
  const a = active.get(id)
  if (!a) return
  clearInterval(a.beep)
  clearTimeout(a.safety)
  // Silence everything already queued so the sound cuts out at once.
  for (const osc of a.oscs) {
    try {
      osc.onended = null
      osc.stop()
      osc.disconnect()
    } catch {
      // Node may have already ended — ignore.
    }
  }
  a.oscs.clear()
  active.delete(id)
  if (active.size === 0) navigator.vibrate?.(0)
}
