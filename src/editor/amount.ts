// The editor shows prefix and amount in one Menge field ("ca. 800"); the wire keeps them apart. Rule from
// docs/design/redesign/README.md §3.3, shared with the planned "Mehrere einfügen" (#249): the prefix is whatever stands
// before the first number. Ranges ("1-2", "1–2") and decimals ("0,5") start with that number and stay whole in `amount`.
// Without any number ("etwas") everything is the amount and there is no prefix.

// \p{No} covers the vulgar fractions (½ ⅓ ⅕ …); it also matches rare superscripts (²), which then start the amount.
const FIRST_NUMBER = /[\p{Nd}\p{No}]/u

export function splitAmount(input: string): { amountPrefix: string; amount: string } {
  const value = input.trim()
  const at = value.search(FIRST_NUMBER)
  if (at <= 0) return { amountPrefix: '', amount: value }
  return { amountPrefix: value.slice(0, at).trim(), amount: value.slice(at).trim() }
}

export function joinAmount(amountPrefix: string, amount: string): string {
  return [amountPrefix.trim(), amount.trim()].filter((part) => part !== '').join(' ')
}
