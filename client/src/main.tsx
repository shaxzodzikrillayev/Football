import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { SiteProvider } from './services/SiteContext';
import { ToastProvider } from './components/Toast';
import './styles/main.scss';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Не найден корневой элемент #root');
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <SiteProvider>
          <App />
        </SiteProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
