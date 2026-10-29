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

// Install the mock responder before mounting (always — REST mode still mocks
// listUsers). It's a dynamic import, so rendering first lets the first mocked
// requests race ahead of the responder and reject with "socket not connected".
// Waiting for bootstrap to settle avoids that.
bootstrap().finally(render)
