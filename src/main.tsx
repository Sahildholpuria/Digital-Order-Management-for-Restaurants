import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';
import { RestaurantProvider } from './context/RestaurantContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <RestaurantProvider>
        <App />
      </RestaurantProvider>
    </ThemeProvider>
  </StrictMode>
);
