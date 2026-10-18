"use client";

import { motion, useInView, animate } from "framer-motion";
import { useEffect, useRef, useState, ReactNode } from "react";

// === BorderBeam — Animated light beam along card borders ===
// Inspired by MagicUI (magicui.design)
export function BorderBeam({
  size = 200,
  duration = 7,
  colorFrom = "#d4a574",
  colorTo = "#a78bfa",
  className = "",
}: {
  size?: number;
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
  className?: string;
}) {
  return (
    <div className={`pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden ${className}`}>
      <motion.div
        className="absolute aspect-square h-full"
        style={{
          width: size,
          background: `linear-gradient(90deg, transparent, ${colorFrom}, ${colorTo}, transparent)`,
          filter: "blur(2px)",
        }}
        animate={{
          left: ["-20%", "120%"],
        }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration,
        }}
      />
    </div>
  );
}

// === Aurora Background — Soft animated gradient ===
// Inspired by Aceternity UI (ui.aceternity.com)
export function AuroraBackground({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Aurora layers */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 20% 50%, rgba(91, 140, 255, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 30%, rgba(212, 165, 116, 0.06) 0%, transparent 50%),
            radial-gradient(circle at 50% 80%, rgba(167, 139, 250, 0.06) 0%, transparent 50%)
          `,
          animation: "aurora-shift 15s ease-in-out infinite alternate",
        }}
      />
      {/* Moving aurora blobs */}
      <motion.div
        className="absolute -top-20 -left-20 w-72 h-72 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: "#5b8cff" }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/2 -right-20 w-80 h-80 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: "#a78bfa" }}
        animate={{ x: [0, -30, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full blur-3xl opacity-08 pointer-events-none"
        style={{ background: "#d4a574" }}
        animate={{ x: [0, 20, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />
      {/* Content above aurora */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// === Shimmer Border — Animated gradient border ===
export function ShimmerBorder({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative group ${className}`}>
      {/* Animated gradient border */}
      <div
        className="absolute -inset-px rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `linear-gradient(110deg, transparent 40%, rgba(212, 165, 116, 0.4), rgba(167, 139, 250, 0.3) 60%, transparent 80%)`,
          backgroundSize: "200% 100%",
          animation: "shimmer-border 3s linear infinite",
        }}
      />
      {children}
    </div>
  );
}

// === AnimatedNumber — Count-up effect ===
export function AnimatedNumber({ value, duration = 1, className = "", format = false }: { value: number; duration?: number; className?: string; format?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate(val) {
        setDisplay(format ? val.toLocaleString("en-US", { maximumFractionDigits: 0 }) : val.toFixed(2));
      },
    });
    return () => controls.stop();
  }, [isInView, value, duration, format]);

  return (
    <span ref={ref} className={`tabular-nums ltr-nums ${className}`}>
      {display}
    </span>
  );
}

// === MagicCard — Hover spotlight effect ===
export function MagicCard({ children, className = "", glowColor = "rgba(212, 165, 116, 0.15)" }: { children: ReactNode; className?: string; glowColor?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  function handleMouseMove(e: React.MouseEvent) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`relative overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* Spotlight overlay */}
      {isHovering && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(300px circle at ${mousePos.x}px ${mousePos.y}px, ${glowColor}, transparent 70%)`,
          }}
        />
      )}
      {children}
    </div>
  );
}

// === ParticleField — Floating particles background ===
export function ParticleField({ count = 15 }: { count?: number }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 3,
    duration: 8 + Math.random() * 12,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: "rgba(212, 165, 116, 0.3)",
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
