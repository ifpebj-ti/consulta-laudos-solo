import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@/styles/tokens.css';
import '@/styles/global.css';
import '@/styles/layout.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
