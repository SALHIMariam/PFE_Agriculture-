import { useState, useEffect } from 'react';

/**
 * useScrollSpy — Returns the id of the section currently in view.
 * Used to highlight the active nav link.
 */
export function useScrollSpy(sectionIds: string[], offset = 120): string {
  const [active, setActive] = useState(sectionIds[0]);

  useEffect(() => {
    const handleScroll = () => {
      let current = sectionIds[0];
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - offset) current = id;
      }
      setActive(current);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sectionIds, offset]);

  return active;
}
