import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './state/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import App from './App';
import { WebBluetoothDotPad } from './sdk/DotPadAdapter';
import { parseEmbedParams } from './embed/embedParams';
import './styles.css';
import './standalone.css';

const params = parseEmbedParams();

// Instantiate the real Web Bluetooth adapter at startup.
// The adapter is inert until the user clicks "Connect" — no BLE picker appears here.
// Explicit construction prevents DotPadSDK from being tree-shaken out of the bundle.
const adapter = new WebBluetoothDotPad();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProvider
        initial={{ lang: params.lang ?? 'ko' }}
        adapter={adapter}
        embedParams={params}
      >
        <App />
      </AppProvider>
    </ErrorBoundary>
  </StrictMode>,
);
