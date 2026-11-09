import { useCallback, useEffect, useState, RefObject } from "react";

const animationMap: Array<{ selector: string; className: string }> = [
  { selector: ".chart-line", className: "chart-line" },
  { selector: ".chart-area", className: "chart-area" },
  { selector: ".chart-dot", className: "chart-dot" },
  { selector: ".donut-arc", className: "donut-arc" },
  { selector: ".bar-fill", className: "bar-fill" },
  { selector: ".rank-fill", className: "rank-fill" },
  { selector: ".reco-eff-fill", className: "reco-eff-fill" },
  { selector: ".hc-ring-fg", className: "hc-ring-fg" },
];

function restartAnimation(element: HTMLElement, className: string) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

export default function useReplayAnimations(
  rootRef: RefObject<HTMLElement | null>,
  sectionKey?: unknown,
) {
  const [replayKey, setReplayKey] = useState(0);

  const replay = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;

    animationMap.forEach(({ selector, className }) => {
      root.querySelectorAll<HTMLElement>(selector).forEach((element) => restartAnimation(element, className));
    });

    setReplayKey((prev) => prev + 1);
  }, [rootRef]);

  useEffect(() => {
    replay();
  }, [replay, sectionKey]);

  return { replayKey, replay };
}
