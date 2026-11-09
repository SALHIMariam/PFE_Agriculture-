import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

type Props = {
  text: string;
  className?: string;
};

/**
 * Small (i) icon that reveals a short explanation on hover/click.
 * Click-to-toggle (not just hover) so it also works on mobile/touch.
 */
export default function InfoTooltip({ text, className = "" }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isVisible) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsVisible(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isVisible]);

  return (
    <span ref={wrapperRef} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={() => setIsVisible((v) => !v)}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="text-gray-300 transition-colors hover:text-gray-500 focus:outline-none dark:text-gray-600 dark:hover:text-gray-400"
        aria-label="Plus d'informations"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {isVisible && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 max-w-[80vw] -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 text-xs leading-relaxed text-gray-600 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          {text}
          <div className="absolute left-1/2 top-full -mt-1.5 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
        </div>
      )}
    </span>
  );
}
