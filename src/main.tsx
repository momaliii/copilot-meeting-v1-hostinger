import './i18n';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import SharedMeeting from './SharedMeeting.tsx';
import { AuthProvider } from './AuthContext.tsx';
import { BrandingProvider } from './contexts/BrandingContext.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

const path = window.location.pathname;
const isShareToken = path.startsWith('/share/');
const shareToken = isShareToken ? path.split('/')[2] : null;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrandingProvider>
        <AuthProvider>
          {isShareToken && shareToken ? <SharedMeeting token={shareToken} /> : <App />}
        </AuthProvider>
      </BrandingProvider>
    </ErrorBoundary>
  </StrictMode>,
);
