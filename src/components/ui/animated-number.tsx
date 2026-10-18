"use client";

import { useEffect, useState, useRef } from "react";

interface Props {
  value: number;
  decimals?: number;
  className?: string;
  style?: React.CSSProperties;
  prefix?: string;
  suffix?: string;
  duration?: number; // animation duration in ms
}

/**
 * AnimatedNumber — smoothly transitions between numeric values.
 * Uses requestAnimationFrame for 60fps smooth animation.
 */
export default function AnimatedNumber({
  value,
  decimals = 2,
  className,
  style,
  prefix = "",
  suffix = "",
  duration = 600,
}: Props) {
  const [displayValue, setDisplayValue] = useState(value);
  const fromRef = useRef<number>(value);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (value === fromRef.current) return;

    fromRef.current = displayValue;
    startRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromRef.current + (value - fromRef.current) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const formatted = displayValue.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className} style={style}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
