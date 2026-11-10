// Frame of the sign-in pages: grey page, card in the upper third so the phone keyboard doesn't cover it.
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function AuthCard({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-4 pt-[12vh] pb-8 text-foreground">
      <div className="mx-auto w-full max-w-sm rounded-lg border bg-card p-6">
        <p className="text-sm font-medium text-muted-foreground">Foodly</p>
        <h1 className="font-display mt-1 mb-6 text-4xl text-foreground">{title}</h1>
        {children}
        <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
      </div>
    </main>
  )
}

export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="font-medium text-foreground underline underline-offset-4">
      {children}
    </Link>
  )
}
