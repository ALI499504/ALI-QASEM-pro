"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pencil,
  TrendingUp,
  Minus,
  Square,
  Eraser,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type ToolType = "none" | "trendline" | "horizontal" | "rectangle" | "erase";

interface Drawing {
  id: string;
  type: "trendline" | "horizontal" | "rectangle";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

interface Props {
  onToolChange?: (tool: ToolType) => void;
  onClear?: () => void;
  activeTool: ToolType;
  setActiveTool: (t: ToolType) => void;
}

const TOOLS: Array<{ id: ToolType; label: string; icon: React.ReactNode; color?: string }> = [
  { id: "trendline", label: "خط اتجاه", icon: <TrendingUp className="w-3.5 h-3.5" />, color: "#3b82f6" },
  { id: "horizontal", label: "خط أفقي", icon: <Minus className="w-3.5 h-3.5" />, color: "#10b981" },
  { id: "rectangle", label: "مستطيل", icon: <Square className="w-3.5 h-3.5" />, color: "#d4a574" },
];

export default function DrawingTools({ onClear, activeTool, setActiveTool }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className={`border-border bg-secondary hover:bg-accent ${
          open ? "border-gold/40 text-gold" : "text-muted-foreground"
        }`}
      >
        <Pencil className="w-3.5 h-3.5" />
        <span className="hidden sm:inline mr-1 text-xs">أدوات الرسم</span>
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center gap-1 overflow-hidden"
          >
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(activeTool === tool.id ? "none" : tool.id)}
                className={`p-1.5 rounded border transition ${
                  activeTool === tool.id
                    ? "border-gold/40 bg-gold/10 text-gold"
                    : "border-border bg-secondary text-muted-foreground hover:border-border-strong"
                }`}
                title={tool.label}
              >
                {tool.icon}
              </button>
            ))}
            <button
              onClick={() => {
                setActiveTool("none");
                onClear?.();
              }}
              className="p-1.5 rounded border border-border bg-secondary text-muted-foreground hover:border-bear/40 hover:text-bear"
              title="مسح الكل"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setActiveTool("none");
                setOpen(false);
              }}
              className="p-1.5 rounded border border-border bg-secondary text-muted-foreground hover:border-border-strong"
              title="إغلاق"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
