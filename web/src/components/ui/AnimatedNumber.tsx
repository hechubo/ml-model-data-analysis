import React, { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  formatLocale?: boolean;
  durationMs?: number;
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  formatLocale = true,
  durationMs = 550,
  className = '',
}) => {
  const [displayVal, setDisplayVal] = useState<number>(value);
  const prevValRef = useRef<number>(value);

  useEffect(() => {
    const startVal = prevValRef.current;
    const endVal = value;
    if (Math.abs(endVal - startVal) < 1e-6) {
      setDisplayVal(endVal);
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // easeOutQuart
      const eased = 1 - Math.pow(1 - t, 4);
      const current = startVal + (endVal - startVal) * eased;
      setDisplayVal(current);
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        prevValRef.current = endVal;
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value, durationMs]);

  const formatted = formatLocale
    ? displayVal.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : displayVal.toFixed(decimals);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
