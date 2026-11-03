import styles from "./Button.module.css";
import { GLYPHS, GLYPH_VIEWBOX, type ButtonIcon } from "./glyphs";

// A hardware button shows only its icon, so the types make it take one, and
// every button takes a label: shown on primary and ghost, the accessible
// name on hardware. No button can be nameless.
export type ButtonProps = {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
} & ({ variant: "primary" | "ghost"; icon?: ButtonIcon } | { variant: "hardware"; icon: ButtonIcon });

// No "use client": it holds no state, and a client parent that passes
// onClick brings it into the client bundle.
export function Button({ variant, icon, label, disabled = false, onClick }: ButtonProps) {
  const iconOnly = variant === "hardware";

  return (
    <button
      type="button"
      className={`${styles.button} ${styles[variant]}`}
      disabled={disabled}
      onClick={onClick}
      aria-label={iconOnly ? label : undefined}
    >
      {icon && <Glyph icon={icon} />}
      {!iconOnly && label}
    </button>
  );
}

function Glyph({ icon }: { icon: ButtonIcon }) {
  const { size, d, stroke } = GLYPHS[icon];

  return (
    <svg className={styles.glyph} width={size} height={size} viewBox={GLYPH_VIEWBOX} aria-hidden>
      {stroke ? (
        <path d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d={d} fill="currentColor" />
      )}
    </svg>
  );
}
