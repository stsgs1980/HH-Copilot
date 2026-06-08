"use client";

import { useEffect } from "react";

/**
 * This component unregisters any existing service workers
 * to prevent them from blocking fetch requests in development mode.
 */
export function ServiceWorkerUnregister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          console.log("[SW] Unregistering service worker:", registration);
          registration.unregister();
        });
      });

      // Also clear all caches
      if ("caches" in window) {
        caches.keys().then((cacheNames) => {
          cacheNames.forEach((cacheName) => {
            console.log("[SW] Deleting cache:", cacheName);
            caches.delete(cacheName);
          });
        });
      }
    }
  }, []);

  return null;
}
