// The 3-px keyboard focus ring of #90/#95, the same width postxl's buttonVariants ships. The colour is left to
// each caller (the surface decides what reaches 3:1). The outline is hidden on focus only: forced-colors mode
// then still draws a transparent-outline fallback while focused (callers have no outline at rest).
export const FOCUS_RING = 'focus-visible:outline-hidden focus-visible:ring-[3px]'
