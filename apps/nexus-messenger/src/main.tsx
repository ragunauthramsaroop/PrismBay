import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Prototype from './Prototype';
import './styles.css';

function Root() {
  const [preview, setPreview] = useState(() => window.location.hash === '#prototype');
  useEffect(() => {
    function synchronizeRoute() { setPreview(window.location.hash === '#prototype'); }
    window.addEventListener('hashchange', synchronizeRoute);
    return () => window.removeEventListener('hashchange', synchronizeRoute);
  }, []);
  const openPreview = () => { window.location.hash = 'prototype'; setPreview(true); };
  const closePreview = () => { window.location.hash = ''; setPreview(false); };
  return preview ? <Prototype onExit={closePreview} /> : <App onPreview={openPreview} />;
}

createRoot(document.getElementById('root')!).render(<Root />);
