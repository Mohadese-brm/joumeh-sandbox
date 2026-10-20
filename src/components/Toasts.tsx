import { useStore } from '../lib/store';
import { Icon } from './Icon';
export function Toasts() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className="toast"><Icon name="tick" size={20} /><span>{t.text}</span>
          {t.action && <button className="link toast__act" onClick={() => { t.action!.onClick(); dismissToast(t.id); }}>{t.action.label}</button>}
          <button className="icon-btn toast__x" aria-label="بستن پیام" onClick={() => dismissToast(t.id)}><Icon name="close" size={18} /></button>
        </div>))}
    </div>
  );
}
