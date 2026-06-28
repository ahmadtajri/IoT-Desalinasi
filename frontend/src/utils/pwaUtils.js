/**
 * PWA Utilities - Handle PWA install prompts and updates
 */

let deferredPrompt = null;

/**
 * Get the deferred install prompt
 * @returns {Event | null}
 */
export const getDeferredPrompt = () => {
  return window.deferredInstallPrompt || deferredPrompt;
};

/**
 * Trigger PWA install prompt
 * @returns {Promise<boolean>}
 */
export const triggerInstallPrompt = async () => {
  const prompt = getDeferredPrompt();
  if (!prompt) {
    return false;
  }

  try {
    prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === 'accepted') {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('[PWA] Install prompt failed:', error);
    return false;
  }
};

/**
 * Check if app is installed
 * @returns {boolean}
 */
export const isAppInstalled = () => {
  // Check if running as PWA
  if (window.navigator.standalone === true) {
    return true;
  }

  // Check if display mode is standalone
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  return false;
};

/**
 * Check if app can be installed
 * @returns {boolean}
 */
export const canInstallApp = () => {
  if (isAppInstalled()) {
    return false;
  }
  return !!getDeferredPrompt();
};

/**
 * Clear app cache
 * @returns {Promise<void>}
 */
export const clearAppCache = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        // Tell service worker to clear cache
        if (registration.active) {
          registration.active.postMessage({ type: 'CLEAR_CACHE' });
        }
      }
    }

    // Also clear all caches
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      await caches.delete(cacheName);
    }

    return true;
  } catch (error) {
    console.error('[PWA] Failed to clear cache:', error);
    return false;
  }
};

/**
 * Check for service worker updates
 * @returns {Promise<boolean>}
 */
export const checkForUpdates = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.update();
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('[PWA] Update check failed:', error);
    return false;
  }
};

/**
 * Get offline status
 * @returns {boolean}
 */
export const isOffline = () => {
  return !navigator.onLine;
};

/**
 * Listen for online/offline status changes
 * @param {Function} callback
 * @returns {Function} unsubscribe function
 */
export const subscribeToOnlineStatus = (callback) => {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

/**
 * Initialize PWA features
 */
export const initPWA = () => {
  // Check if running as PWA
  if (isAppInstalled()) {
    document.body.classList.add('pwa-installed');
  }

  // Handle offline status
  if (isOffline()) {
    document.body.classList.add('offline-mode');
  }

  // Listen for online/offline changes
  subscribeToOnlineStatus((isOnline) => {
    if (isOnline) {
      document.body.classList.remove('offline-mode');
    } else {
      document.body.classList.add('offline-mode');
    }
  });
};

export default {
  getDeferredPrompt,
  triggerInstallPrompt,
  isAppInstalled,
  canInstallApp,
  clearAppCache,
  checkForUpdates,
  isOffline,
  subscribeToOnlineStatus,
  initPWA
};
