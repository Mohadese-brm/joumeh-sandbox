import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';
/** Accessible dialog: focus trap, Esc to close, focus restore. Bottom sheet on mobile via CSS. */
export function Modal({ title, onClose, children, labelId = 'dlg-title', sheet = false, wide = false, hideTitle = false }: { title: string; onClose: () => void; children: ReactNode; labelId?: string; sheet?: boolean; wide?: boolean; hideTitle?: boolean }) {
  const ref = useRef<HTMLDivElement>(null); const closeRef = useRef(onClose);
  useLayoutEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current!; const f = () => [...el.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(x => !x.hasAttribute('disabled'));
    (el.querySelector<HTMLElement>('[data-autofocus]') ?? f()[1] ?? f()[0])?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') { const l = f(); if (!l.length) return; const a = l[0], z = l[l.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    };
    document.addEventListener('keydown', key); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = ''; prev?.focus?.(); };
  }, []); // mount only: re-running on every render would steal focus while typing
  return (
    <div className="modal" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`modal__box${sheet ? ' modal__box--sheet' : ''}${wide ? ' modal__box--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={labelId}>
        {sheet && <span className="modal__grip" aria-hidden="true" />}
        <div className="modal__head"><h2 id={labelId} className={`modal__title${hideTitle ? ' modal__title--mobileonly' : ''}`}>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="بستن"><Icon name="close" /></button></div>
        {children}
      </div>
    </div>
  );
}
