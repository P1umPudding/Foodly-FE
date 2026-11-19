// Its own module so tests can mock it: jsdom's `window.location` can't be stubbed.
export function reloadPage() {
  window.location.reload()
}
