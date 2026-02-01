import React from 'react';
import ReactDOM from 'react-dom/client';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import App from './App';
import { PAYPAL_CONFIG } from './lib/paypal';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <PayPalScriptProvider options={PAYPAL_CONFIG}>
      <App />
    </PayPalScriptProvider>
  </React.StrictMode>
);
