import { STORE_ADDRESS, STORE_HOURS, STORE_PHONE_DISPLAY, STORE_PHONE_TEL } from '../content/store';

/** Address, phone and hours. The shop has no public email. */
export function StoreContact({ className = '' }: { className?: string }) {
  return (
    <div className={`store-contact${className ? ` ${className}` : ''}`}>
      <p className="small" style={{ margin: 0 }}>{STORE_ADDRESS}</p>
      <p className="small" style={{ margin: 0 }}><a href={`tel:${STORE_PHONE_TEL}`}>{STORE_PHONE_DISPLAY}</a></p>
      <p className="small" style={{ margin: 0 }}>{STORE_HOURS}</p>
    </div>
  );
}
