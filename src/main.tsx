import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeProvider';
import { bootstrap } from './api';
import App from './App';
import './styles/styles.css';

// Open the backend connection on startup — or attach mock data when VITE_MOCK=1.
void bootstrap();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
