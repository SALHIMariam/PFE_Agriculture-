import { useEffect, useRef, useState } from 'react';

/**
 * useIntersection — fires once when element enters viewport.
 * Used for AOS-style animations and counter triggers.
 */
export function useIntersection(options: IntersectionObserverInit = {}) {
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(el);
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px', ...options });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, isVisible] as const;
}
