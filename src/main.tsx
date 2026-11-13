import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './theme/ThemeProvider'
import { bootstrap } from './api'
import App from './App'
import './styles/styles.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)

function render() {
  root.render(
    <React.StrictMode>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </React.StrictMode>,
  )
}

// Render runs only after bootstrap settles: it installs the mock responder (mock mode only; a no-op in REST)
// via a dynamic import, and rendering first would let the first mocked requests race ahead of it and reject
// with "socket not connected". If bootstrap fails, the error is logged and the app renders anyway; a render
// failure is logged the same way.
// No top-level await: in the production build the mock chunk imports modules it shares with this entry chunk,
// so awaiting here deadlocks (the entry never finishes evaluating) and the page stays blank (#233).
void bootstrap()
  .catch((error: unknown) => console.error(error))
  .then(render)
  .catch((error: unknown) => console.error(error))
