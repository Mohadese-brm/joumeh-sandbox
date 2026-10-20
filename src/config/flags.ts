// Design-decision flags. Status of each value is recorded in docs/decision-log.md.
export type Flags = {
  /** R-1 — DECIDED (CEO 2026-10-21 02:12): 20%. Badge text always renders from the product's data field; this flag only toggles the badge. */
  showDiscountBadge: boolean;
  /** R-2 — DECIDED (CEO 2026-10-21 02:13): 'apply' = select, then Apply updates results + URL; with clear/reset. 'off' hides filters. */
  filterMode: 'apply' | 'off';
  /** R-3 — DECIDED (CEO 2026-10-21 02:13): 'carousel' (manual, no autoplay). 'static' keeps a single static hero. */
  heroMode: 'carousel' | 'static';
  /** RESOLVED (Emma 2026-10-21 02:16): 17px desktop / 14px mobile (v2/Shop/Current Price). 'token' kept only as a fallback. */
  priceSize: '17px' | 'token';
};
export const flags: Flags = { showDiscountBadge: true, filterMode: 'apply', heroMode: 'carousel', priceSize: '17px' };
