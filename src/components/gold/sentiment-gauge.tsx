"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

interface Props {
  // -100 (extreme bear) .. +100 (extreme bull)
  value: number;
}

export default function SentimentGauge({ value }: Props) {
  // Map [-100..100] to [0..1]
  const norm = Math.min(1, Math.max(0, (value + 100) / 200));
  const targetAngle = -90 + norm * 180; // -90..90

  const angle = useMotionValue(-90);
  const color = useTransform(
    angle,
    [-90, -20, 20, 90],
    ["#ff4d6a", "#ff8e6e", "#ffc933", "#22d39a"]
  );
  const label = useTransform(
    angle,
    [-90, -45, -15, 15, 45, 90],
    ["خوف شديد", "خوف", "حذر", "حياد", "جشع", "جشع شديد"]
  );

  useEffect(() => {
    const controls = animate(angle, targetAngle, {
      duration: 1.4,
      ease: "easeOut",
    });
    return () => controls.stop();
  }, [targetAngle, angle]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[220px] h-[120px]">
        <svg viewBox="0 0 220 120" className="w-full h-full">
          {/* Arc background */}
          <path
            d="M 10 110 A 100 100 0 0 1 210 110"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
          />
          {/* Color segments */}
          <path
            d="M 10 110 A 100 100 0 0 1 75 22"
            stroke="rgba(255,77,106,0.35)"
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 75 22 A 100 100 0 0 1 145 22"
            stroke="rgba(255,201,51,0.35)"
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 145 22 A 100 100 0 0 1 210 110"
            stroke="rgba(34,211,154,0.35)"
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
          />
          {/* Tick marks */}
          {[-90, -45, 0, 45, 90].map((a) => {
            const rad = (a * Math.PI) / 180;
            const x1 = 110 + 100 * Math.cos(rad + Math.PI / 2);
            const y1 = 110 - 100 * Math.sin(rad + Math.PI / 2);
            const x2 = 110 + 88 * Math.cos(rad + Math.PI / 2);
            const y2 = 110 - 88 * Math.sin(rad + Math.PI / 2);
            return (
              <line
                key={a}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1.5"
              />
            );
          })}
          {/* Needle */}
          <motion.g
            style={{ rotate: angle }}
            initial={false}
          >
            <line
              x1="110"
              y1="110"
              x2="110"
              y2="20"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.7))" }}
            />
            <polygon points="110,16 105,28 115,28" fill="white" />
          </motion.g>
          {/* Hub */}
          <circle cx="110" cy="110" r="10" fill="#0b0f1d" stroke="rgba(255,201,51,0.6)" strokeWidth="2" />
          <circle cx="110" cy="110" r="3" fill="#ffc933" />
        </svg>
      </div>
      <motion.div
        className="text-lg font-bold mt-1"
        style={{ color }}
      >
        <motion.span>{label}</motion.span>
      </motion.div>
      <div className="text-xs text-muted-foreground mt-1">
        القيمة اللحظية: {value > 0 ? "+" : ""}{value.toFixed(0)}
      </div>
    </div>
  );
}
