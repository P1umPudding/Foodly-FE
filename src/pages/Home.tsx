import { Badge, Card, CardContent, CardHeader, CardTitle } from '@postxl/ui-components';
import { useSocketStatus } from '../hooks/useSocketStatus';

const STATUS_LABEL: Record<string, string> = {
  open: 'Verbunden',
  connecting: 'Verbinde …',
  closed: 'Getrennt',
};

export function Home() {
  const status = useSocketStatus();
  const wsUrl = import.meta.env.VITE_WS_URL || '(nicht gesetzt — siehe .env.example)';

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <p className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
        <span className="h-px w-8 bg-primary" />
        Frontend
      </p>
      <h1 className="font-display mt-6 text-4xl text-foreground sm:text-5xl">Foodly</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Frontend-only React-App, die ein fremdes Backend über einen WebSocket
        anbindet. Vite · React · TypeScript · Tailwind v4 · <code>@postxl/ui-components</code>.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              Backend-Verbindung
              <Badge variant={status === 'open' ? 'default' : 'secondary'}>
                {STATUS_LABEL[status]}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Endpoint:{' '}
              <code className="break-all rounded bg-muted px-1.5 py-0.5 text-foreground">
                {wsUrl}
              </code>
            </p>
            <p className="mt-2">
              Der gemeinsame Socket liegt in <code>src/api</code> und verbindet
              sich beim Start automatisch (mit Reconnect).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loslegen</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ol className="ml-4 list-decimal space-y-1">
              <li>
                <code>.env.example</code> → <code>.env.local</code>,{' '}
                <code>VITE_WS_URL</code> setzen
              </li>
              <li>Nachrichten-Typen in <code>src/api/index.ts</code> anpassen</li>
              <li>
                Daten laden mit <code>useRequest(() =&gt; foodly.listRecipes())</code>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
