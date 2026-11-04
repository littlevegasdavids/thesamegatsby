"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { FilterKey, FilterOption } from "../../release-filter";
import styles from "./ReleaseFilter.module.css";
import { filterLabel, moveActive } from "./listbox";

type ReleaseFilterProps = {
  /** From releaseFilterOptions: All first, empty types already left out. */
  options: readonly FilterOption[];
  selected: FilterKey;
  onSelect?: (key: FilterKey) => void;
  /** Opens the phone list on first render, so /system can show it open. */
  defaultOpen?: boolean;
};

const CHEVRON = "M6 9l6 6 6-6";
const TICK = "M5 12.5l4.5 4.5L19 7";

// The discography's filter. Both shapes render and CSS shows one: below
// 768 px a "Show" dropdown (a button that pops up a listbox), from 768 px a
// row of pressed buttons with the heading inside the box. It returns the
// heading and the box as siblings, so the box's sticky parent is the
// discography itself and it sticks through the whole list.
export function ReleaseFilter({ options, selected, onSelect, defaultOpen = false }: ReleaseFilterProps) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);
  const selectedIndex = Math.max(
    options.findIndex(({ key }) => key === selected),
    0,
  );
  const [active, setActive] = useState(selectedIndex);
  const boxRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Focus moves into the list only when someone opens it, never on mount.
  const focusList = useRef(false);

  useEffect(() => {
    if (open && focusList.current) listRef.current?.focus({ preventScroll: true });
    focusList.current = false;
  }, [open]);

  // A tap or click anywhere outside the box closes the list.
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const show = () => {
    setActive(selectedIndex);
    focusList.current = true;
    setOpen(true);
  };

  const pick = (key: FilterKey) => {
    setOpen(false);
    triggerRef.current?.focus();
    onSelect?.(key);
  };

  const onTriggerKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      show();
    }
  };

  const onListKey = (event: KeyboardEvent) => {
    const next = moveActive(active, event.key, options.length);
    if (next !== null) {
      event.preventDefault();
      setActive(next);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(options[active].key);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  const current = options[selectedIndex];
  const heading = (className: string, headingId: string) => (
    <div className={className}>
      <h2 id={headingId} className={styles.title}>
        Discography
      </h2>
      <span className={styles.note}>30 SEC SNIPPETS</span>
    </div>
  );
  const optionId = (key: FilterKey) => `${id}-option-${key}`;

  return (
    <>
      {heading(styles.outerHeading, `${id}-heading`)}
      <div ref={boxRef} className={`${styles.box} dg-glass`}>
        <div className={styles.menu}>
          <span id={`${id}-show`} className={styles.show}>
            Show
          </span>
          <button
            ref={triggerRef}
            type="button"
            className={styles.trigger}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={`${id}-list`}
            aria-labelledby={`${id}-show ${id}-value`}
            onClick={() => (open ? setOpen(false) : show())}
            onKeyDown={onTriggerKey}
          >
            <span id={`${id}-value`} className={styles.value}>
              {current && filterLabel(current, "menu")}
              <span className={styles.count}>{current?.count}</span>
            </span>
            <svg className={open ? `${styles.chevron} ${styles.open}` : styles.chevron} width={16} height={16} viewBox="0 0 24 24" aria-hidden>
              <path d={CHEVRON} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <ul
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            aria-label="Show releases"
            aria-activedescendant={open ? optionId(options[active].key) : undefined}
            tabIndex={-1}
            className={styles.listbox}
            hidden={!open}
            onKeyDown={onListKey}
          >
            {options.map((option, i) => (
              <li
                key={option.key}
                id={optionId(option.key)}
                role="option"
                aria-selected={option.key === selected}
                className={i === active ? `${styles.option} ${styles.active}` : styles.option}
                onClick={() => pick(option.key)}
                onPointerEnter={() => setActive(i)}
              >
                <span className={styles.tick}>
                  {option.key === selected && (
                    <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden>
                      <path d={TICK} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className={styles.optionLabel}>{filterLabel(option, "menu")}</span>
                <span className={styles.count}>{option.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.buttons}>
          {heading(styles.innerHeading, `${id}-heading-wide`)}
          <div role="group" aria-label="Filter releases" className={styles.group}>
            {options.map((option) => (
              <button
                key={option.key}
                type="button"
                className={styles.button}
                aria-pressed={option.key === selected}
                onClick={() => onSelect?.(option.key)}
              >
                {filterLabel(option, "buttons")}
                <span className={styles.count}>{option.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
