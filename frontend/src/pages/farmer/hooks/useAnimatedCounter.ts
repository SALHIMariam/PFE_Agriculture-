import { useEffect, useState } from "react";

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export default function useAnimatedCounter(
  target: string | number,
  enabled = true,
  duration = 1200,
  trigger = 0,
): string {
  const [display, setDisplay] = useState(String(target));

  useEffect(() => {
    const nextTarget = String(target).trim();
    if (!enabled) {
      setDisplay(nextTarget);
      return;
    }

    const isPercent = nextTarget.endsWith("%");
    const isPlus = nextTarget.endsWith("+");
    const clean = nextTarget.replace(/[%+ ]/g, "").replace(",", ".");
    const value = Number(clean);

    if (Number.isNaN(value)) {
      setDisplay(nextTarget);
      return;
    }

    const suffix = isPercent ? "%" : isPlus ? "+" : "";
    const decimals = clean.includes(".") ? clean.split(".")[1].length : 0;
    let animationFrame = 0;
    const startTime = performance.now();

    const step = (time: number) => {
      const elapsed = Math.min((time - startTime) / duration, 1);
      const eased = easeOutCubic(elapsed);
      const currentValue = value * eased;
      setDisplay(`${currentValue.toFixed(decimals)}${suffix}`);
      if (elapsed < 1) {
        animationFrame = requestAnimationFrame(step);
      } else {
        setDisplay(`${value.toFixed(decimals)}${suffix}`);
      }
    };

    animationFrame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animationFrame);
  }, [target, enabled, duration, trigger]);

  return display;
}
