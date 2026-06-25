import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeProvider';
import { bootstrap } from './api';
import App from './App';
import './styles/styles.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);

function render() {
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </React.StrictMode>,
  );
}

// Prepare the backend before mounting: open the real connection, or install the
// mock responder when VITE_MOCK=1. The mock path is async (a dynamic import that
// keeps mocks out of the prod bundle), so rendering first lets the app's first
// requests race ahead of the responder and reject with "socket not connected".
// Waiting for bootstrap to settle avoids that.
bootstrap().finally(render);
