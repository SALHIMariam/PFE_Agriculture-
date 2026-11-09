import { useEffect } from "react";
import { ApexOptions } from "apexcharts";

const STYLE_ID = "expert-analytics-apexcharts-tooltip-fix";

const TOOLTIP_CSS = `
  .apexcharts-tooltip {
    background: #ffffff !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 12px !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08) !important;
    padding: 0 !important;
    overflow: hidden !important;
  }
  .dark .apexcharts-tooltip {
    background: #1f2937 !important;
    border-color: #374151 !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
  }
  .apexcharts-tooltip-title {
    background: #f9fafb !important;
    border-bottom: 1px solid #e5e7eb !important;
    padding: 8px 12px !important;
    font-weight: 600 !important;
    font-size: 12px !important;
    color: #6b7280 !important;
    margin: 0 !important;
  }
  .dark .apexcharts-tooltip-title {
    background: #111827 !important;
    border-bottom-color: #374151 !important;
    color: #9ca3af !important;
  }
  .apexcharts-tooltip-series-group {
    padding: 6px 12px !important;
    display: flex !important;
    align-items: center !important;
  }
  .apexcharts-tooltip-text-y-value,
  .apexcharts-tooltip-text-z-value {
    font-weight: 700 !important;
    font-size: 14px !important;
    color: #111827 !important;
  }
  .dark .apexcharts-tooltip-text-y-value,
  .dark .apexcharts-tooltip-text-z-value {
    color: #f3f4f6 !important;
  }
  .apexcharts-tooltip-text-y-label {
    font-size: 12px !important;
    color: #6b7280 !important;
    margin-right: 4px !important;
  }
  .dark .apexcharts-tooltip-text-y-label {
    color: #9ca3af !important;
  }
  .apexcharts-tooltip-marker {
    width: 10px !important;
    height: 10px !important;
    border-radius: 50% !important;
    margin-right: 8px !important;
  }
  .apexcharts-xcrosshairs,
  .apexcharts-ycrosshairs {
    stroke: #d1d5db !important;
    stroke-width: 1px !important;
    stroke-dasharray: 4 !important;
  }
  .dark .apexcharts-xcrosshairs,
  .dark .apexcharts-ycrosshairs {
    stroke: #4b5563 !important;
  }
  .apexcharts-data-labels text {
    font-size: 11px !important;
    font-weight: 600 !important;
  }
`;

/** Injects the shared ApexCharts tooltip/crosshair CSS once for the whole page. */
export function useApexTooltipStyles() {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = TOOLTIP_CSS;
    document.head.appendChild(style);
  }, []);
}

/** Shared tooltip base — merge chart-specific `y`/`x` formatters on top. */
export function sharedTooltip(isDark: boolean, overrides: ApexOptions["tooltip"] = {}): ApexOptions["tooltip"] {
  return {
    enabled: true,
    shared: true,
    intersect: false,
    followCursor: false,
    theme: isDark ? "dark" : "light",
    style: { fontSize: "13px", fontFamily: "inherit" },
    marker: { show: true },
    fixed: { enabled: false },
    ...overrides,
  };
}

type ApexCrosshairs = NonNullable<NonNullable<ApexOptions["xaxis"]>["crosshairs"]>;

/** Shared crosshair styling for line/area charts. */
export function sharedCrosshairs(isDark: boolean): ApexCrosshairs {
  return {
    show: true,
    position: "back",
    stroke: { color: isDark ? "#4b5563" : "#d1d5db", width: 1, dashArray: 4 },
  };
}

/** Shared label/grid colors reused across every chart on the page. */
export function chartBaseTheme(isDark: boolean) {
  return {
    foreColor: isDark ? "#9ca3af" : "#6b7280",
    labelColor: isDark ? "#9ca3af" : "#64748b",
    gridColor: isDark ? "#374151" : "#f1f5f9",
  };
}
