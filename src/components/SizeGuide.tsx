import { Link } from 'react-router-dom';
import { Icon } from './Icon';
// P8 ruling: layout per Figma 245:61044 (sheet 245:61112; Bottom Sheet Type=Size guide 244:61642).
// Table values and column set are CONTENT → BLOCKED BD-18; shown as labelled sample dashes, never invented numbers.
const COLS = ['قد', '½ دور کمر', '½ دور باسن', '½ دور ران', '½ دور زانو', 'دمپا']; // column labels as sampled in 245:61044 (trousers); final set per category = BD-18
export function SizeGuide({ name, type, sizes }: { name?: string; type?: string; sizes: string[] }) {
  return (
    <div className="sg" data-figma="245:61044">
      <div className="sg__head">
        <p className="sg__title">{name ? `جومه · ${name}` : 'جومه'} <span className="muted">(نام نمونه)</span></p>
        <p className="small muted">جدول رسمی اندازه سایزبندی محصول</p>
        <div className="sg__chips"><span className="sg__chip">دسته‌بندی: {type ?? 'در انتظار تصمیم'}</span><span className="sg__chip">واحد: در انتظار تصمیم</span></div>
      </div>
      <div className="sg__tablewrap" tabIndex={0} role="region" aria-label="جدول سایز (داده نمونه)">
        <table className="sg__table">
          <thead><tr><th scope="col">سایز محصول</th>{COLS.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>{(sizes.length ? sizes : ['—']).map(s => <tr key={s}><th scope="row">{s}</th>{COLS.map(c => <td key={c}><span aria-hidden="true">—</span><span className="sr-only">نامشخص</span></td>)}</tr>)}</tbody>
        </table>
      </div>
      <p className="sg__note small">داده نمونه — اندازه‌های جومه هنوز تأیید نشده‌اند (در انتظار تصمیم کسب‌وکار، BD-18)</p>
      <p className="sg__info small"><Icon name="information-circle" size={24} /><span>راهنمای اندازه‌گیری: متن نمونه — در انتظار محتوای تأییدشده</span></p>
      <p className="small" style={{ margin: 0 }}>برای سؤال درباره سایز با <Link to="/support/contact">پشتیبانی</Link> تماس بگیرید</p>
    </div>
  );
}
export function SizeGuidePage() {
  return <div className="wrap" style={{ paddingBlock: 32, maxInlineSize: 760 }}><h1 className="h-page" style={{ marginBlockEnd: 16 }}>راهنمای سایز</h1><SizeGuide sizes={['S', 'M', 'L', 'XL', 'XXL']} /></div>;
}
