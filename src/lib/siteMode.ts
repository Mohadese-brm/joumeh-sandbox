// gerdoo-update-2026-10-28: what the server is actually serving (seeded sample rows, or the read-time sample overlay). Fetched once.
import { useEffect, useState } from 'react';
import { api } from './api';
export type SiteMode = { sampleData: boolean; sampleOverlay: boolean; ordersBlocked: boolean; notice?: string };
let cached: Promise<SiteMode> | null = null;
const load = () => (cached ??= api<never>('/health').then(r => r as unknown as SiteMode).catch(() => { cached = null; return { sampleData: false, sampleOverlay: false, ordersBlocked: false }; }));
export function useSiteMode(): SiteMode | null {
  const [m, setM] = useState<SiteMode | null>(null);
  useEffect(() => { let live = true; void load().then(x => live && setM(x)); return () => { live = false; }; }, []);
  return m;
}
export const SAMPLE_ORDERS_BLOCKED = 'حالت نمایشی (نمونه): قیمت‌ها، سایزها، رنگ‌ها و نظرها نمونه هستند و ثبت سفارش در این حالت غیرفعال است.';
