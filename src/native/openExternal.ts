// External links in the native app open in the in-app browser (Custom Tabs / SFSafariViewController, E7); a plain
// target="_blank" would leave the app's WebView.
export function openExternal(url: string): void {
  void import('@capacitor/browser').then(({ Browser }) => Browser.open({ url })).catch(() => {})
}
