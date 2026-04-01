import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { GoogleOAuthProvider } from '@react-oauth/google';

// ✅ ADD FIREBASE SERVICE WORKER REGISTRATION HERE
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
            console.log('✅ Firebase SW registered:', registration);
        })
        .catch((error) => {
            console.log('❌ Firebase SW registration failed:', error);
        });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId="717835472146-q64jshe0dmc9l9jfa260m69uqn4ut1et.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);

reportWebVitals();