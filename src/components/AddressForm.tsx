import { useState } from 'react';
import { PROVINCES } from '../lib/provinces';
export type AddrValues = { recipient: string; phone: string; province: string; city: string; line: string; postalCode: string; landline: string };
export const emptyAddr: AddrValues = { recipient: '', phone: '', province: '', city: '', line: '', postalCode: '', landline: '' };
/** Shared address fields (Figma 58:790 checkout + 126:36253 address add). City is a text field: no city list exists in the design data (flagged). */
export function AddressFields({ v, set, errors, idp = 'a' }: { v: AddrValues; set: (v: AddrValues) => void; errors: Record<string, string>; idp?: string }) {
  const f = (k: keyof AddrValues, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="field"><label htmlFor={`${idp}-${k}`}>{label}</label>
      <input id={`${idp}-${k}`} className="input" value={v[k]} onChange={e => set({ ...v, [k]: e.target.value })} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `${idp}-${k}-e` : undefined} {...props} />
      {errors[k] && <p className="err" id={`${idp}-${k}-e`}>{errors[k]}</p>}</div>);
  return (
    <div className="grid-2">
      {f('recipient', 'نام و نام خانوادگی', { autoComplete: 'name' })}
      {f('phone', 'شماره موبایل', { inputMode: 'tel', autoComplete: 'tel', dir: 'ltr', placeholder: '۰۹۱۲ ۳۴۵ ۶۷۸۹' })}
      <div className="field"><label htmlFor={`${idp}-province`}>استان</label>
        <select id={`${idp}-province`} className="input" value={v.province} onChange={e => set({ ...v, province: e.target.value })} aria-invalid={!!errors.province} aria-describedby={errors.province ? `${idp}-province-e` : undefined}>
          <option value="">انتخاب کنید</option>{PROVINCES.map(p => <option key={p}>{p}</option>)}</select>
        {errors.province && <p className="err" id={`${idp}-province-e`}>{errors.province}</p>}</div>
      {f('city', 'شهر', { autoComplete: 'address-level2' })}
      <div style={{ gridColumn: '1 / -1' }}>{f('line', 'نشانی کامل', { autoComplete: 'street-address', placeholder: 'خیابان، کوچه، پلاک، واحد' })}</div>
      {f('postalCode', 'کد پستی', { inputMode: 'numeric', dir: 'ltr', placeholder: '۱۰ رقم بدون خط تیره', autoComplete: 'postal-code' })}
      {f('landline', 'تلفن ثابت (اختیاری)', { inputMode: 'tel', dir: 'ltr' })}
    </div>
  );
}
export function useAddrState(init: AddrValues = emptyAddr) { return useState<AddrValues>(init); }
