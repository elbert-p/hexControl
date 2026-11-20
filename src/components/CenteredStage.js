// src/components/CenteredStage.js
"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Keeps the main content (the level map / a puzzle) vertically centered in the space it's
 * given — exactly where it would be without any extra bars — while showing:
 *   - `top`:   a bar pinned to the top of the space (Hexle banner, progress strip)
 *   - `below`: something that sits right under the content (e.g. the Results button)
 * The bars never push the content off-center; it only moves (and, if needed, shrinks) when
 * there would otherwise be no gap between them.
 *
 * `boxSelector` picks the visible box inside `children` to center (e.g. ".dynamicWrapper").
 * The content gets a definite-height flex column to size itself in, so components that
 * scale to their container keep working.
 */
export default function CenteredStage({ top, below, boxSelector, gap = 12, children }) {
  const areaRef = useRef(null);
  const topRef = useRef(null);
  const belowRef = useRef(null);
  const contentRef = useRef(null);
  const observedBoxRef = useRef(null);

  const [bars, setBars] = useState(null); // reserved px: { top, below }
  const [placement, setPlacement] = useState({ dy: 0, belowTop: 0 });

  const measureBars = useCallback(() => {
    const t = topRef.current ? Math.ceil(topRef.current.offsetHeight) + gap : 0;
    const b = belowRef.current ? Math.ceil(belowRef.current.offsetHeight) + gap : 0;
    setBars((prev) => (prev && prev.top === t && prev.below === b ? prev : { top: t, below: b }));
  }, [gap]);

  const findBox = () => {
    const content = contentRef.current;
    if (!content) return null;
    return (boxSelector && content.querySelector(boxSelector)) || null;
  };

  const place = useCallback(() => {
    const area = areaRef.current;
    const content = contentRef.current;
    const box = findBox();
    if (!area || !content || !box || !bars) return;

    const A = area.clientHeight;
    const boxRect = box.getBoundingClientRect();
    const rel = boxRect.top - content.getBoundingClientRect().top; // unaffected by our shift
    const M = boxRect.height;

    // Box top (within the area): centered, but never closer than `gap` to either bar.
    const ideal = (A - M) / 2;
    const minY = bars.top;
    const maxY = Math.max(minY, A - bars.below - M);
    const y = Math.min(Math.max(ideal, minY), maxY);

    const next = { dy: Math.round(y - bars.top - rel), belowTop: Math.round(y + M + gap) };
    setPlacement((prev) => (prev.dy === next.dy && prev.belowTop === next.belowTop ? prev : next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, gap, boxSelector]);

  // Measure the bars before the content first renders, so it sizes itself correctly.
  useLayoutEffect(() => {
    measureBars();
  });

  // Re-place after every render (cheap; state only changes when the numbers do).
  useLayoutEffect(() => {
    place();
  });

  // Content that scales to its container (puzzle board, level map) only re-measures on
  // window resize, so nudge it when the space we give it changes after mounting.
  const firstBarsRef = useRef(true);
  useEffect(() => {
    if (!bars) return;
    if (firstBarsRef.current) {
      firstBarsRef.current = false;
      return;
    }
    window.dispatchEvent(new Event("resize"));
  }, [bars]);

  // Follow size changes of the area, the bars and the box itself.
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      measureBars();
      place();
    });
    [areaRef.current, topRef.current, belowRef.current].forEach((el) => el && observer.observe(el));
    const box = findBox();
    if (box) observer.observe(box);
    observedBoxRef.current = box;
    return () => observer.disconnect();
  });

  return (
    <div
      ref={areaRef}
      style={{ position: "relative", flex: 1, minHeight: 0, width: "100%", overflow: "hidden" }}
    >
      {top && (
        <div ref={topRef} style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 2 }}>
          {top}
        </div>
      )}

      {bars && (
        <div
          ref={contentRef}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            // Shift by moving top and bottom together (size unchanged). Not a CSS transform:
            // that would trap position:fixed popups (e.g. "You solved Level X") inside it.
            top: bars.top + placement.dy,
            bottom: bars.below - placement.dy,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {children}
        </div>
      )}

      {below && (
        <div
          ref={belowRef}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: placement.belowTop,
            display: "flex",
            justifyContent: "center",
            zIndex: 2,
          }}
        >
          {below}
        </div>
      )}
    </div>
  );
}
