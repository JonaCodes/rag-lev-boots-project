import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/figtree/400.css';
import '@fontsource/figtree/600.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/600.css';
import '@mantine/core/styles.css';

import './index.css';
import App from './App.tsx';
import { MantineProvider } from '@mantine/core';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider forceColorScheme='dark'>
      <App />
    </MantineProvider>
  </StrictMode>
);
