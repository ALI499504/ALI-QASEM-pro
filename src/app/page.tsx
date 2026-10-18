"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import ErrorBoundary from "@/components/gold/terminal-error-boundary";

const MT5Terminal = dynamic(() => import("@/components/gold/mt5-terminal"), {
  ssr: false,
  loading: () => (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      background: "#1e1e1e",
      color: "#888",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: 13,
    }}>
      Loading M.ROBOT MT5 Terminal...
    </div>
  ),
});

export default function Home() {
  useEffect(() => {
    // === Unregister any old service workers to clear cached JS ===
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => {
          reg.unregister().then(() => {
            console.log("Old service worker unregistered");
          });
        });
      });
      // Also clear all caches
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    }
  }, []);

  return (
    <ErrorBoundary name="MT5Terminal">
      <MT5Terminal />
    </ErrorBoundary>
  );
}
