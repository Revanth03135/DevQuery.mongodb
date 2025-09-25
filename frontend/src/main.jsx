import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { UserProvider } from './context/UserContext'; // 1. Import UserProvider

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UserProvider> {/* 2. Wrap App with UserProvider */}
      <App />
    </UserProvider>
  </StrictMode>,
);