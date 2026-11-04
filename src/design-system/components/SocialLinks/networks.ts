import type { SocialLink, SocialNetwork } from "../../types.ts";

// Instagram and TikTok are the only socials (SPEC.md), always in this order.
const ORDER: readonly SocialNetwork[] = ["instagram", "tiktok"];

export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
};

export const FOOTER_HEADING = "Follow the signal";

// The links in the fixed order. If a network is listed twice, the first wins.
export function orderSocials(links: readonly SocialLink[]): SocialLink[] {
  return ORDER.flatMap((network) => links.find((link) => link.network === network) ?? []);
}

// Handles are stored without their "@". One that slips in with it still
// shows a single one.
export function socialHandle(link: SocialLink): string {
  return `@${link.handle.replace(/^@+/, "")}`;
}

// The link's name. Where the handle shows, the name carries it too, so the
// visible text is part of what's read.
export function socialName(link: SocialLink, withHandle: boolean): string {
  const label = SOCIAL_LABELS[link.network];
  return withHandle ? `${label}: ${socialHandle(link)}` : label;
}
