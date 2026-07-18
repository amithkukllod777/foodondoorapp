import { useCallback, useRef } from "react";

/**
 * Cross-device (touch + mouse) horizontal image swipe via Pointer Events.
 *
 * The caller owns the active index; this hook only detects a deliberate
 * horizontal drag and reports it. A tap (small movement) or a mostly-vertical
 * drag is ignored so it can stay a normal click / page scroll.
 *
 *   const swipe = useImageSwipe({ count, index, onChange: setIndex });
 *   <div
 *     style={{ touchAction: "pan-y" }}
 *     onPointerDown={swipe.onPointerDown}
 *     onPointerUp={swipe.onPointerUp}
 *     onClick={(e) => { if (swipe.consumeSwipe()) { e.preventDefault(); return; } ...tap... }}
 *   />
 *
 * `consumeSwipe()` returns true exactly once after a swipe, so the click that
 * the browser fires right after the gesture can be cancelled (e.g. don't
 * navigate / don't open the zoom).
 */
export function useImageSwipe(opts: {
  count: number;
  index: number;
  onChange: (next: number) => void;
}) {
  const latest = useRef(opts);
  latest.current = opts;

  const startX = useRef(0);
  const startY = useRef(0);
  const swiped = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
    swiped.current = false;
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const { count, index, onChange } = latest.current;
    if (count <= 1) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    // Only a clear horizontal drag counts (ignore taps and vertical scrolls).
    if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
    swiped.current = true;
    onChange(dx < 0 ? Math.min(index + 1, count - 1) : Math.max(index - 1, 0));
  }, []);

  const consumeSwipe = useCallback(() => {
    if (!swiped.current) return false;
    swiped.current = false;
    return true;
  }, []);

  return { onPointerDown, onPointerUp, consumeSwipe };
}
