import type { FilterOption } from "../../release-filter.ts";

// The filter's words and keys, kept out of the .tsx so
// tests/release-filter-ui.test.ts can check them.

// The phone dropdown reads "All releases", as Main.dc.html draws it. The
// desktop buttons read "All".
export function filterLabel(option: FilterOption, shape: "menu" | "buttons"): string {
  return option.key === "all" && shape === "menu" ? "All releases" : option.label;
}

// Where a key moves the open list's active option, held at the ends, or null
// for a key that doesn't move it.
export function moveActive(current: number, key: string, length: number): number | null {
  switch (key) {
    case "ArrowDown":
      return Math.min(current + 1, length - 1);
    case "ArrowUp":
      return Math.max(current - 1, 0);
    case "Home":
      return 0;
    case "End":
      return length - 1;
    default:
      return null;
  }
}

// The desktop row's scrollLeft that shows a focused button whole, with
// `margin` px clear either side for its focus ring. Chromium scrolls a
// focused element into view only when none of it shows, so a button cut by
// the row's edge would keep focus out of sight. `start` is the button's
// left edge from the row's scroll origin.
export function revealOffset(scrollLeft: number, viewWidth: number, start: number, size: number, margin: number): number {
  if (start - margin < scrollLeft) return Math.max(start - margin, 0);
  if (start + size + margin > scrollLeft + viewWidth) return start + size + margin - viewWidth;
  return scrollLeft;
}
