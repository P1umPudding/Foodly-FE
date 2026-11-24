// Frame for full-screen pages without sidebar or tab bar (cook mode). Timers, catalogs and toasts come from
// RequireAuth; the panel provider lets a time chip in the page open the page's own timer button.
import { Outlet } from 'react-router'
import { TimerPanelProvider } from '../../timers/TimerPanelContext'

export function BareLayout() {
  return (
    <TimerPanelProvider>
      <Outlet />
    </TimerPanelProvider>
  )
}
