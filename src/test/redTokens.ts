// Red text, border or fill anywhere under `root` (design.md §5: load errors are neutral cards). postxl's aria-invalid
// ring variants on buttons don't count.
export function redTokens(root: Element): string[] {
  return [...root.querySelectorAll('*')].flatMap((el) =>
    [...el.classList].filter((c) => /^(bg|text|border)-destructive/.test(c)),
  )
}
