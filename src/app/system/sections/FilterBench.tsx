"use client";

import { useState } from "react";
// From its own file, not index.ts: through the barrel, the build put
// /system's CSS in the chunk / loads.
import { ReleaseFilter } from "../../../design-system/components/ReleaseFilter/ReleaseFilter";
import { releaseCategory, releaseFilterOptions, type FilterKey } from "../../../design-system/release-filter";
import type { Release } from "../../../design-system/types";
import styles from "../system.module.css";

// One live filter on /system: it holds the selection, as site will, and says
// how many releases the pick leaves, so mouse, touch and keyboard can be
// tried here. Each sits in its own box, so it can't stick across the bench.
export function FilterBench({
  releases,
  initial = "all",
  defaultOpen = false,
  caption,
}: {
  releases: readonly Release[];
  initial?: FilterKey;
  defaultOpen?: boolean;
  caption: string;
}) {
  const [selected, setSelected] = useState<FilterKey>(initial);
  const shown = releases.filter((r) => selected === "all" || releaseCategory(r) === selected).length;

  return (
    <div className={styles.stack}>
      <div className={defaultOpen ? `${styles.filterBench} ${styles.filterBenchOpen}` : styles.filterBench}>
        <ReleaseFilter options={releaseFilterOptions(releases)} selected={selected} onSelect={setSelected} defaultOpen={defaultOpen} />
      </div>
      <span className={styles.cap}>
        {caption} · showing {shown} of {releases.length}
      </span>
    </div>
  );
}
