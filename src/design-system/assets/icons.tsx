import { ICONS, MARK_VIEWBOX, STAND_IN_VIEWBOX, type IconName } from "./icon-paths";

// One brand mark, painted in currentColor so it takes its link's colour:
// monochrome in --dg-fg, as the brands' guidelines allow. It's always
// aria-hidden, because the link around it carries the platform's name.
export function PlatformIcon({ icon, size }: { icon: IconName; size: number }) {
  const { d, stroke } = ICONS[icon];

  return (
    <svg width={size} height={size} viewBox={stroke ? STAND_IN_VIEWBOX : MARK_VIEWBOX} aria-hidden focusable="false">
      <path
        d={d}
        fill={stroke ? "none" : "currentColor"}
        stroke={stroke ? "currentColor" : undefined}
        strokeWidth={stroke ? 1.8 : undefined}
        strokeLinecap={stroke ? "round" : undefined}
        strokeLinejoin={stroke ? "round" : undefined}
      />
    </svg>
  );
}
