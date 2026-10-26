import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';
/** Breadcrumb 56:560 — items 14/24, gap 4; separator Icon/ChevL (Left 2 72:8058) 16px from the Figma icon pack.
 *  design-batch-2026-10-26: the current item uses the shared selected indicator (teal + 2px underline, 8px gap) like the active header tab. */
export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className="crumbs" aria-label="مسیر صفحه" data-figma="56:560"><ol>{items.map((it, i) => (
      <li key={i}>{i > 0 && <span className="crumbs__sep" aria-hidden="true"><Icon name="left-2" size={16} /></span>}
        {it.to && i < items.length - 1 ? <Link to={it.to}>{it.label}</Link> : <Fragment><span aria-current="page">{it.label}</span></Fragment>}</li>))}
    </ol></nav>
  );
}
