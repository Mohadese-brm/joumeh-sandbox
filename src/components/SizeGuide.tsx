import { Icon } from './Icon';

/** Approved size chart (Figma 245:61044 / 245:61112). Body measurements in centimetres, not garment measurements. */
export const SIZE_ROWS = [
  { size: 'S · ۳۸', chest: '۹۰–۹۴', waist: '۸۲–۸۶', hip: '۹۸–۱۰۲' },
  { size: 'M · ۴۰', chest: '۹۸–۱۰۲', waist: '۹۰–۹۴', hip: '۱۰۶–۱۱۰' },
  { size: 'L · ۴۲', chest: '۱۰۶–۱۱۰', waist: '۹۸–۱۰۲', hip: '۱۱۴–۱۱۸' },
  { size: 'XL · ۴۴', chest: '۱۱۴–۱۱۸', waist: '۱۰۶–۱۱۰', hip: '۱۲۲–۱۲۶' },
] as const;
export const SIZE_NOTES = [
  'ابعاد ذکر شده اندازه افرادی است که لباس مناسب آن‌هاست و الزاما ابعاد لباس نیست.',
  'برای اندازه‌گیری، نوار متر را نه خیلی محکم و نه چندان آزاد بگیرید.',
] as const;

const Cell = ({ children }: { children: string }) => <bdi dir="ltr">{children}</bdi>;

export function SizeGuide(_props: { name?: string; type?: string; sizes?: string[] }) {
  return (
    <div className="sg">
      <p className="sg__unit">سانتی‌متر</p>
      <div className="sg__tablewrap">
        <table className="sg__table">
          <thead>
            <tr>
              <th scope="col">سایز</th>
              <th scope="col">دور سینه</th>
              <th scope="col">دور کمر</th>
              <th scope="col">دور باسن</th>
            </tr>
          </thead>
          <tbody>
            {SIZE_ROWS.map(r => (
              <tr key={r.size}>
                <th scope="row"><Cell>{r.size}</Cell></th>
                <td><Cell>{r.chest}</Cell></td>
                <td><Cell>{r.waist}</Cell></td>
                <td><Cell>{r.hip}</Cell></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sg__info">
        <Icon name="information-circle" size={20} />
        <div className="sg__notes">
          {SIZE_NOTES.map(n => <p key={n}>{n}</p>)}
        </div>
      </div>
    </div>
  );
}
export function SizeGuidePage() {
  return <div className="wrap" style={{ paddingBlock: 32, maxInlineSize: 760 }}><h1 className="h-page" style={{ marginBlockEnd: 16 }}>راهنمای سایز</h1><SizeGuide /></div>;
}
