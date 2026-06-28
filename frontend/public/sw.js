// Cleanup service worker - unregisters itself immediately
// This file exists as a fallback for browsers that still reference sw.js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => {
    self.registration.unregister();
});
