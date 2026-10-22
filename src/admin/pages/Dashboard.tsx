// Figma 177:14723 Dashboard / Main. KPI definitions = placeholder (ADMIN-PH-KPI).
import { Link, useNavigate } from 'react-router-dom';
import { useLoad } from './hooks';
import { Loading, ErrorState, PageTitle, StatusBadge, ORDER_STATUS, PAY_STATUS, Table, toman, fa, when, Stub } from '../ui';
import { faNumber } from '../../lib/format';
import { useMe, can } from '../AdminApp';

export function Dashboard() {
  const { data: d, error, loading, reload } = useLoad<any>('/dashboard'); const me = useMe(); const nav = useNavigate();
  if (loading && !d) return <Loading />; if (error) return <ErrorState retry={reload} />;
  const k: [string, string, string][] = [
    ['فروش امروز', `${toman(d.salesToday)} تومان`, `${faNumber(d.paidToday)} سفارش پرداخت‌شده`],
    ['سفارش‌های امروز', faNumber(d.ordersToday), `${faNumber(d.awaitingPayment)} در انتظار پرداخت`],
    ['در حال پردازش', faNumber(d.processing), 'نیازمند آماده‌سازی'],
    ['ارسال شده', faNumber(d.shipped), 'در مسیر تحویل'],
    ['میانگین ارزش سفارش', `${toman(d.avgOrder)} تومان`, 'سفارش‌های پرداخت‌شده'],
    ['درخواست‌های مرجوعی', faNumber(d.openReturns), 'در حال بررسی'],
    ['تنوع ناموجود', faNumber(d.unavailableVariants), 'فقط پرچم موجودی (BD-16)'],
    ['نظرات', faNumber(d.reviews), 'همه‌ی نظرات ثبت‌شده'],
  ];
  return <>
    <PageTitle crumb="داشبورد" title="داشبورد" sub={<>سلام {me.name}! کارهای امروز اینجاست. همه اعداد «داده نمونه» هستند. <Stub code="ADMIN-PH-KPI">تعریف شاخص‌ها</Stub></>} />
    <div className="adm-kpis">{k.map(([l, v, s]) => <div key={l} className="adm-kpi"><span className="lab">{l}</span><span className="val">{v}</span><small>{s}</small></div>)}</div>
    <div className="adm-grid2">
      <section className="adm-card"><div className="adm-card-head"><h2>سفارش‌های اخیر</h2>{can(me, 'orders') && <Link className="adm-btn sm" to="/admin/orders">مشاهده همه</Link>}</div>
        <Table head={['سفارش', 'مشتری', 'اقلام', 'مبلغ (تومان)', 'پرداخت', 'وضعیت سفارش', 'زمان']}>
          {d.recentOrders.map((o: any) => <tr key={o.id} className={can(me, 'orders') ? 'click' : ''} onClick={() => can(me, 'orders') && nav(`/admin/orders/${o.id}`)}>
            <td style={{ color: 'var(--a-brand)', fontWeight: 600 }}>{fa(o.orderNumber)}</td><td>{o.customer}</td><td>{faNumber(o.items)} قلم</td><td>{toman(o.total)}</td>
            <td><StatusBadge map={PAY_STATUS} value={o.paymentStatus} /></td><td><StatusBadge map={ORDER_STATUS} value={o.orderStatus} /></td><td className="adm-muted">{when(o.createdAt)}</td></tr>)}
        </Table></section>
      <section className="adm-card"><h2>نیازمند اقدام</h2>
        {d.awaitingPayment > 0 && <div className="adm-sec"><span>{faNumber(d.awaitingPayment)} سفارش در انتظار پرداخت</span>{can(me, 'orders') && <Link className="adm-btn sm" to="/admin/orders">بررسی</Link>}</div>}
        {d.processing > 0 && <div className="adm-sec"><span>{faNumber(d.processing)} سفارش آماده‌سازی نشده</span>{can(me, 'orders') && <Link className="adm-btn sm" to="/admin/orders">بررسی</Link>}</div>}
        {d.unavailableVariants > 0 && <div className="adm-sec"><span>{faNumber(d.unavailableVariants)} تنوع ناموجود</span>{can(me, 'products') && <Link className="adm-btn sm" to="/admin/products">تنظیم موجودی</Link>}</div>}
        {d.openReturns > 0 && <div className="adm-sec"><span>{faNumber(d.openReturns)} درخواست مرجوعی در حال بررسی</span><span className="adm-muted" style={{ flex: 0, whiteSpace: 'nowrap' }}>فاز ۲</span></div>}
      </section>
    </div>
    <div className="adm-grid2">
      <section className="adm-card"><h2>فروش ۷ روز اخیر</h2><div className="adm-bars" aria-hidden="true">{[40, 55, 30, 70, 50, 90, 75].map((h, i) => <div key={i} className={i === 6 ? 'hi' : ''} style={{ height: `${h}%` }} />)}</div>
        <span className="adm-muted">نمودار نمونه — منبع داده پس از راه‌اندازی درگاه و گزارش‌ها (BD-01)</span></section>
      <section className="adm-card"><h2>پرفروش‌ها (نمونه)</h2>
        {d.topProducts.map((p: any) => <div key={p.name} className="adm-sec"><span className="adm-thumb" style={{ flex: '0 0 40px' }} /><span><b>{p.name}</b></span><span className="adm-muted" style={{ flex: 0, whiteSpace: 'nowrap' }}>{faNumber(p.sold)} فروش</span></div>)}
        <div className="adm-muted">رتبه‌بندی پرفروش‌ها: تعریف در انتظار تصمیم (Refinement 2)</div></section>
    </div>
  </>;
}
