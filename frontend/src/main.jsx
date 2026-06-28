import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Clean up: unregister ALL service workers left by old VitePWA builds
// This ensures no stale service worker causes reload loops
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
            registration.unregister();
        }
    });
    // Clear all caches left by old service workers
    if ('caches' in window) {
        caches.keys().then((names) => {
            for (const name of names) {
                caches.delete(name);
            }
        });
    }
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
