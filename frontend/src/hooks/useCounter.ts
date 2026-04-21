import { useState, useEffect } from 'react';

interface UseCounterOptions {
  run?: boolean;
  suffix?: string;
  special?: string | null;
}

/**
 * useCounter — animates a number from 0 to target.
 * Pass `run: true` to start the animation.
 */
export function useCounter(
  target: number,
  { run = false, suffix = '', special = null }: UseCounterOptions = {}
): string {
  const [display, setDisplay] = useState('0' + suffix);

  useEffect(() => {
    if (!run) return;
    if (special) { setDisplay(special); return; }

    const duration = Math.min(400 + target * 3, 1800);
    const easeOut  = (t: number) => 1 - Math.pow(1 - t, 2.5);
    let startTime: number | null = null;

    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setDisplay(Math.floor(easeOut(progress) * target) + suffix);
      if (progress < 1) requestAnimationFrame(step);
      else setDisplay(target + suffix);
    };
    requestAnimationFrame(step);
  }, [run, target, suffix, special]);

  return display;
}
