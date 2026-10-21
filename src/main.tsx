import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import { HashRouter } from 'react-router-dom';
import '@/styles/index.css';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
