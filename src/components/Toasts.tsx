import { useStore } from '../lib/store';
import { Icon } from './Icon';
/** Approved add-to-cart notice (desktop 380×44, mobile 358×44). Other short messages share the same bar. */
export function Toasts() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="toasts" aria-live="polite" aria-relevant="additions">
      {toasts.map(t => (
        <div key={t.id} className="toast" role="status">
          <p className="toast__msg">{t.text}</p>
          {t.action && <button type="button" className="toast__act" onClick={() => { t.action!.onClick(); dismissToast(t.id); }}>{t.action.label}</button>}
          <button type="button" className="toast__x" aria-label="بستن پیام" onClick={() => dismissToast(t.id)}><Icon name="close" size={16} /></button>
        </div>))}
    </div>
  );
}
