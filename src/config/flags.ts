// Design-decision flags. Status of each value is recorded in docs/decision-log.md.
export type Flags = {
  /** R-1 — DECIDED (CEO 2026-10-21 02:12): 20%. Badge text always renders from the product's data field; this flag only toggles the badge. */
  showDiscountBadge: boolean;
  /** R-2 — DECIDED (CEO 2026-10-21 02:13): 'apply' = select, then Apply updates results + URL; with clear/reset. 'off' hides filters. */
  filterMode: 'off' | 'off';
  /** R-3 — DECIDED (CEO 2026-10-21 02:13): 'carousel' (manual, no autoplay). 'static' keeps a single static hero.
   *  SUPERSEDED 2026-10-26 (design-batch-2026-10-26 item 1, CEO brief): 'static' = one fixed full-bleed hero image (HeroStatic). */
  heroMode: 'carousel' | 'static';
  /** RESOLVED (Emma 2026-10-21 02:16): 17px desktop / 14px mobile (v2/Shop/Current Price). 'token' kept only as a fallback. */
  priceSize: '17px' | 'token';
  /** Customer alerts for cart reservation, «موجودی کافی نیست», and price-change. Off until asked. Server stock code stays. */
  stockNotices: boolean;
  /** Shipping fees shown only after the address is confirmed. Empty = no rate, so nothing is added and nothing is labelled pending. */
  shippingRates: { id: string; label: string; fee: number }[];
};
export const flags: Flags = { showDiscountBadge: true, filterMode: 'off', heroMode: 'static', priceSize: '17px', stockNotices: false, shippingRates: [] };
