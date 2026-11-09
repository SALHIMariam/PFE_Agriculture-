import { useState } from "react";
import { Info } from "lucide-react";
import InfoTooltip from "./InfoTooltip";

interface ComponentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string; // Additional custom classes for styling
  desc?: string; // Description text
  tooltip?: string; // Short explanation shown in a hover/click info tooltip next to the title
  collapsibleInfo?: string; // Longer explanation shown/hidden via a toggle next to the title
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = "",
  desc = "",
  tooltip,
  collapsibleInfo,
}) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      {/* Card Header */}
      <div className="px-6 py-5">
        <div className="flex items-center gap-1">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            {title}
          </h3>
          {tooltip && <InfoTooltip text={tooltip} />}
          {collapsibleInfo && (
            <button
              type="button"
              onClick={() => setShowInfo((v) => !v)}
              className="text-gray-300 transition-colors hover:text-gray-500 focus:outline-none dark:text-gray-600 dark:hover:text-gray-400"
              aria-label="Plus d'informations"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {desc && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {desc}
          </p>
        )}
        {collapsibleInfo && showInfo && (
          <p className="mt-2 max-w-lg rounded-lg bg-gray-50 p-2.5 text-xs leading-relaxed text-gray-500 dark:bg-gray-700/30 dark:text-gray-400">
            {collapsibleInfo}
          </p>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6">
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
};

export default ComponentCard;
