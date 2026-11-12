import React from 'react';
import { createRoot } from 'react-dom/client';
import { Prototipo } from './Prototipo';
import './relatorio.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Prototipo />
  </React.StrictMode>
);
