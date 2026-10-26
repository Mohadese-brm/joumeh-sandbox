import { describe, it, expect } from 'vitest';
import { toJalali, toGregorian, monthLength, weekdaySat0, isLeapJalali, tehranToday } from '../src/admin/jalali';
describe('Jalali conversion (Date Picker 173:14077)', () => {
  it('known dates both ways', () => {
    expect(toJalali('2026-10-26')).toEqual({ jy: 1405, jm: 8, jd: 4 }); // ۴ آبان ۱۴۰۵
    expect(toJalali('2025-03-21')).toEqual({ jy: 1404, jm: 1, jd: 1 }); // Nowruz 1404
    expect(toJalali('2026-03-21')).toEqual({ jy: 1405, jm: 1, jd: 1 });
    expect(toGregorian({ jy: 1405, jm: 7, jd: 1 })).toBe('2026-09-23');
    expect(toGregorian({ jy: 1403, jm: 12, jd: 30 })).toBe('2025-03-20'); // 1403 is leap
    for (let t = Date.UTC(2024, 0, 1); t < Date.UTC(2028, 0, 1); t += 86400000 * 3) { const iso = new Date(t).toISOString().slice(0, 10); expect(toGregorian(toJalali(iso))).toBe(iso); }
  });
  it('month lengths, leap years, Saturday-first week, Tehran today', () => {
    expect([monthLength(1405, 1), monthLength(1405, 7), monthLength(1403, 12), monthLength(1404, 12)]).toEqual([31, 30, 30, 29]);
    expect([isLeapJalali(1403), isLeapJalali(1404)]).toEqual([true, false]);
    expect(weekdaySat0('2026-10-24')).toBe(0); // Saturday
    expect(weekdaySat0('2026-10-30')).toBe(6); // Friday
    expect(tehranToday(new Date('2026-10-26T20:45:00Z'))).toBe('2026-10-27'); // 00:15 Tehran next day
  });
});

import { pageWindow } from '../src/admin/ui';
describe('pageWindow', () => {
  it('collapses long page lists', () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(1, 40)).toEqual([1, 2, 0, 40]);
    expect(pageWindow(20, 40)).toEqual([1, 0, 19, 20, 21, 0, 40]);
    expect(pageWindow(40, 40)).toEqual([1, 0, 39, 40]);
  });
});
