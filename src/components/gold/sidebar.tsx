"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useNavStore, NAV_ITEMS } from "@/lib/nav-store";
import { ChevronRight, ChevronLeft } from "lucide-react";

export default function Sidebar() {
  const { activeView, setActiveView, sidebarCollapsed, toggleSidebar } = useNavStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 60 : 220 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="flex-shrink-0 border-l border-border bg-card flex flex-col"
    >
      {/* Logo / Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-between p-3 border-b border-border hover:bg-secondary/50 transition"
      >
        {!sidebarCollapsed && (
          <span className="text-xs font-bold text-gold truncate tracking-wide">M.ROBOT</span>
        )}
        <div className="w-6 h-6 rounded flex items-center justify-center hover:bg-secondary transition">
          {sidebarCollapsed ? (
            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Nav items */}
      <nav className="flex-1 py-2 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition relative group ${
              activeView === item.id
                ? "bg-gold/10 text-gold"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            }`}
          >
            {/* Active indicator bar */}
            {activeView === item.id && (
              <motion.div
                layoutId="active-bar"
                className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-gold rounded-full"
              />
            )}
            <span className="text-base flex-shrink-0 w-5 text-center">{item.icon}</span>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0 text-right">
                <div className="text-xs font-bold truncate">{item.label}</div>
                <div className="text-[9px] text-muted-foreground/70 truncate">{item.desc}</div>
              </div>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className="p-3 border-t border-border">
          <div className="text-[9px] text-muted-foreground/60 text-center font-mono">
            v2026.1 • Pro+
          </div>
        </div>
      )}
    </motion.aside>
  );
}
