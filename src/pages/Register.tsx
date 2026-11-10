import { useRef, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { Alert, AlertDescription, Button, Spinner } from '@postxl/ui-components'
import { ApiError, foodly } from '../api'
import { AuthCard, AuthLink } from '../components/auth/AuthCard'
import { AuthField } from '../components/auth/AuthField'
import {
  EMPTY_EMAIL,
  EMPTY_NAME,
  PASSWORD_HINT,
  PASSWORD_MIN_LENGTH,
  TOO_MANY_ATTEMPTS,
} from '../components/auth/texts'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const FIELDS = ['name', 'email', 'password'] as const
type Field = (typeof FIELDS)[number]
type Errors = Partial<Record<Field, string>>

const GENERIC = 'Registrieren hat nicht geklappt. Bitte versuch es noch einmal.'

function validate(values: Record<Field, string>): Errors {
  const errors: Errors = {}
  if (!values.name.trim()) errors.name = EMPTY_NAME
  if (!values.email.trim()) errors.email = EMPTY_EMAIL
  if (values.password.length < PASSWORD_MIN_LENGTH) errors.password = PASSWORD_HINT
  return errors
}

// 422 carries the backend's validation message; the client checks should already prevent it. Without
// a message in the body, ApiError's "HTTP 422" is no text for the user.
function errorText(err: unknown): string {
  if (err instanceof ApiError && err.status === 429) return TOO_MANY_ATTEMPTS
  if (err instanceof ApiError && err.status === 422 && err.fromBody) return err.message
  return GENERIC
}

const withParams = (path: string, params: Record<string, string | null>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value)
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

export function Register() {
  useDocumentTitle('Konto anlegen · Foodly')
  const [params] = useSearchParams()
  const next = params.get('next')
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [errors, setErrors] = useState<Errors>({})
  const [takenEmail, setTakenEmail] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const refs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
  }

  const change = (field: Field) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }))
    setTouched((t) => ({ ...t, [field]: true }))
    if (field === 'email') setTakenEmail(null)
  }
  // Like Login: checked on leaving only once edited.
  const blur = (field: Field) => () => {
    if (touched[field]) setErrors((e) => ({ ...e, [field]: validate(values)[field] }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const found = validate(values)
    const firstInvalid = FIELDS.find((f) => found[f])
    if (firstInvalid) {
      // Rendered before focusing, so a screen reader announces the field together with its error.
      flushSync(() => setErrors(found))
      refs[firstInvalid].current?.focus()
      return
    }
    setErrors({})
    const email = values.email.trim()
    setBusy(true)
    setFailure(null)
    setTakenEmail(null)
    try {
      // On success RedirectIfSignedIn leaves the page as soon as the session is stored.
      await foodly.auth.signUp(values.name.trim(), email, values.password)
    } catch (err) {
      const taken = err instanceof ApiError && err.status === 409
      flushSync(() => {
        setBusy(false)
        if (taken) setTakenEmail(email)
        else setFailure(errorText(err))
      })
      if (taken) refs.email.current?.focus()
    }
  }

  const emailError = takenEmail ? (
    <>
      Diese E-Mail ist schon registriert.{' '}
      <AuthLink to={withParams('/login', { email: takenEmail, next })}>Anmelden</AuthLink>
    </>
  ) : (
    errors.email
  )

  return (
    <AuthCard
      title="Konto anlegen"
      footer={
        <>
          Schon ein Konto? <AuthLink to={withParams('/login', { next })}>Anmelden</AuthLink>
        </>
      }
    >
      <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <AuthField
          id="register-name"
          label="Name"
          autoComplete="name"
          autoFocus
          value={values.name}
          onChange={change('name')}
          onBlur={blur('name')}
          error={errors.name}
          inputRef={refs.name}
        />
        <AuthField
          id="register-email"
          label="E-Mail"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={change('email')}
          onBlur={blur('email')}
          error={emailError}
          inputRef={refs.email}
        />
        <AuthField
          id="register-password"
          label="Passwort"
          type="password"
          autoComplete="new-password"
          revealable
          value={values.password}
          onChange={change('password')}
          onBlur={blur('password')}
          error={errors.password}
          hint={PASSWORD_HINT}
          inputRef={refs.password}
        />
        {failure && (
          <Alert variant="destructive">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Spinner className="size-4" />}
          Konto anlegen
        </Button>
      </form>
    </AuthCard>
  )
}
