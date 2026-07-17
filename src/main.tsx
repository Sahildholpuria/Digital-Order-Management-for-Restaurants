import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';
import { RestaurantProvider } from './context/RestaurantContext';
import { WorkspaceProvider } from './context/WorkspaceContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <RestaurantProvider>
        <WorkspaceProvider>
          <App />
        </WorkspaceProvider>
      </RestaurantProvider>
    </ThemeProvider>
  </StrictMode>
);
