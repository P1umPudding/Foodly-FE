import { useSocketStatus } from '../hooks/useSocketStatus';

const LABEL: Record<string, string> = {
  open: 'Verbunden',
  connecting: 'Verbinde …',
  closed: 'Getrennt',
};
const DOT: Record<string, string> = {
  open: 'bg-success',
  connecting: 'bg-warning',
  closed: 'bg-destructive',
};

/** Small live indicator of the backend WebSocket connection. */
export function ConnectionDot() {
  const status = useSocketStatus();
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
      title={`Backend: ${LABEL[status]}`}
    >
      <span className={`h-2 w-2 rounded-full ${DOT[status]}`} />
      <span className="hidden sm:inline">{LABEL[status]}</span>
    </span>
  );
}
