import { STORE_ADDRESS, STORE_PHONE_DISPLAY, STORE_PHONE_TEL } from '../content/store';

/** Address and phone, wherever the shop shows how to reach Joumeh. No email or hours — those are still open. */
export function StoreContact({ className = '' }: { className?: string }) {
  return (
    <div className={`store-contact${className ? ` ${className}` : ''}`}>
      <p className="small" style={{ margin: 0 }}>{STORE_ADDRESS}</p>
      <p className="small" style={{ margin: 0 }}><a href={`tel:${STORE_PHONE_TEL}`}>{STORE_PHONE_DISPLAY}</a></p>
    </div>
  );
}
