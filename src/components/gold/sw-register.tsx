"use client";

import { useEffect } from "react";

/**
 * Registers/updates the service worker.
 * This version forces the SW to update immediately (skipWaiting) and
 * also unregisters any stale SW that might be caching old content.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        // First, check for existing registrations and unregister them
        const existingRegs = await navigator.serviceWorker.getRegistrations();
        for (const reg of existingRegs) {
          // Force update to get the latest SW
          await reg.update();
          // If this is an old SW, unregister it
          // The new SW will self-unregister anyway, but this speeds it up
        }

        // Register the new SW (which will self-unregister and clear caches)
        const reg = await navigator.serviceWorker.register("/sw.js?v=v2-cleanup", {
          scope: "/",
          updateViaCache: "none",
        });

        // Force the SW to update immediately
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed") {
                // New SW installed — it will self-unregister on activate
                console.log("[M.ROBOT] SW updated — clearing cache and unregistering");
              }
            });
          }
        });

        console.log("[M.ROBOT] SW registered (cleanup version)");
      } catch (e) {
        console.warn("[M.ROBOT] SW registration failed:", e);
      }
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
