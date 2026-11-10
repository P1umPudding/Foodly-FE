import { useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert, AlertDescription, Button, Spinner } from '@postxl/ui-components'
import { ApiError, foodly } from '../api'
import { AuthCard, AuthLink } from '../components/auth/AuthCard'
import { AuthField } from '../components/auth/AuthField'
import { EMPTY_EMAIL, EMPTY_PASSWORD, TOO_MANY_ATTEMPTS } from '../components/auth/texts'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

type Field = 'email' | 'password'
type Errors = Partial<Record<Field, string>>

function validate(values: Record<Field, string>): Errors {
  const errors: Errors = {}
  if (!values.email.trim()) errors.email = EMPTY_EMAIL
  if (!values.password) errors.password = EMPTY_PASSWORD
  return errors
}

function errorText(err: unknown): string {
  if (err instanceof ApiError && err.status === 401) return 'E-Mail oder Passwort stimmt nicht.'
  if (err instanceof ApiError && err.status === 429) return TOO_MANY_ATTEMPTS
  return 'Anmelden hat nicht geklappt. Bitte versuch es noch einmal.'
}

export function Login() {
  useDocumentTitle('Anmelden · Foodly')
  const [params] = useSearchParams()
  const next = params.get('next')
  const prefilledEmail = params.get('email') ?? ''
  const [values, setValues] = useState({ email: prefilledEmail, password: '' })
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [errors, setErrors] = useState<Errors>({})
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const refs = { email: useRef<HTMLInputElement>(null), password: useRef<HTMLInputElement>(null) }

  const change = (field: Field) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }))
    setTouched((t) => ({ ...t, [field]: true }))
  }
  // Checked on leaving only once the field was edited, so leaving the autofocused field to click a link
  // doesn't flash an error.
  const blur = (field: Field) => () => {
    if (touched[field]) setErrors((e) => ({ ...e, [field]: validate(values)[field] }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const found = validate(values)
    setErrors(found)
    const firstInvalid = (['email', 'password'] as const).find((f) => found[f])
    if (firstInvalid) {
      refs[firstInvalid].current?.focus()
      return
    }
    setBusy(true)
    setFailure(null)
    try {
      // On success RedirectIfSignedIn leaves the page as soon as the session is stored.
      await foodly.auth.signIn(values.email.trim(), values.password)
    } catch (err) {
      setBusy(false)
      setFailure(errorText(err))
      if (err instanceof ApiError && err.status === 401) {
        setValues((v) => ({ ...v, password: '' }))
        refs.password.current?.focus()
      }
    }
  }

  const registerTo = next ? `/register?${new URLSearchParams({ next }).toString()}` : '/register'

  return (
    <AuthCard
      title="Anmelden"
      footer={
        <>
          Noch kein Konto? <AuthLink to={registerTo}>Registrieren</AuthLink>
        </>
      }
    >
      <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <AuthField
          id="login-email"
          label="E-Mail"
          type="email"
          autoComplete="email"
          autoFocus={!prefilledEmail}
          value={values.email}
          onChange={change('email')}
          onBlur={blur('email')}
          error={errors.email}
          inputRef={refs.email}
        />
        <AuthField
          id="login-password"
          label="Passwort"
          type="password"
          autoComplete="current-password"
          autoFocus={!!prefilledEmail}
          revealable
          value={values.password}
          onChange={change('password')}
          onBlur={blur('password')}
          error={errors.password}
          inputRef={refs.password}
        />
        {failure && (
          <Alert variant="destructive">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Spinner className="size-4" />}
          Anmelden
        </Button>
      </form>
    </AuthCard>
  )
}
