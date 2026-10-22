// Figma Content 183:45033 (Homepage 183:40414, Pages & policies 183:40707, Edit page 183:41017).
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLoad } from './hooks';
import { aapi, AdminApiError } from '../api';
import { Badge, Button, Empty, ErrorState, Field, Loading, NoPermission, PageTitle, Stub, Table, Tabs, toast, when } from '../ui';
import { useMe, can } from '../AdminApp';

export function Content() {
  const me = useMe(); const nav = useNavigate(); const [tab, setTab] = useState<'home' | 'pages'>('home');
  const { data, error, loading, reload } = useLoad<any>(can(me, 'content') ? '/content' : null);
  const [h, setH] = useState<any>(null); const [errs, setErrs] = useState<Record<string, string>>({});
  useEffect(() => { if (data) setH(data.home); }, [data]);
  if (!can(me, 'content')) return <NoPermission />;
  if (loading && !data) return <Loading />; if (error) return <ErrorState retry={reload} />;
  const edit = can(me, 'content', 'edit');
  const save = async () => { setErrs({}); try { await aapi('/content/home', { method: 'PUT', body: h }); toast('محتوای صفحه اصلی ذخیره شد'); reload(); } catch (e) { setErrs((e as AdminApiError).fields ?? {}); toast('ذخیره انجام نشد', true); } };
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setH({ ...h, [k]: e.target.value });
  const move = (i: number, d: number) => { const s = [...h.sections]; const j = i + d; if (j < 0 || j >= s.length) return; [s[i], s[j]] = [s[j], s[i]]; setH({ ...h, sections: s }); };
  return <>
    <PageTitle crumb="مالی و بازاریابی / محتوای سایت" title={tab === 'home' ? 'محتوای صفحه اصلی' : 'صفحات و قوانین'} sub="تغییرات فقط پس از «انتشار» در سایت دیده می‌شود"
      actions={tab === 'home' && edit && <Button kind="primary" onClick={save}>انتشار</Button>} />
    <Tabs items={[['home', 'صفحه اصلی'], ['pages', 'صفحات و قوانین']]} value={tab} onChange={setTab} />
    {tab === 'home' && h && <>
      <section className="adm-card"><h2>بنر اصلی (ثابت)</h2>
        <div className="adm-info">بنر ثابت است: بدون پخش خودکار و بدون کنترل اسلاید — مطابق طراحی تأییدشده‌ی سایت.</div>
        <div className="adm-warnbox">بارگذاری تصویر بنر به فضای ذخیره‌سازی فایل نیاز دارد (<Stub code="ADMIN-PH-MEDIA">ذخیره‌سازی</Stub>). اتصال این فرم به بنر فروشگاه هنوز انجام نشده: <Stub code="ADMIN-PH-HERO">اتصال بنر</Stub></div>
        <Field label="عنوان" req err={errs.heroTitle}><input className="adm-input" value={h.heroTitle} onChange={set('heroTitle')} disabled={!edit} /></Field>
        <div className="adm-row"><Field label="متن دکمه" req err={errs.heroCta}><input className="adm-input" value={h.heroCta} onChange={set('heroCta')} disabled={!edit} /></Field>
          <Field label="لینک" req err={errs.heroLink}><input className="adm-input" dir="ltr" value={h.heroLink} onChange={set('heroLink')} disabled={!edit} /></Field></div>
        <Field label="متن جایگزین تصویر (الزامی)" req err={errs.heroAlt}><input className="adm-input" value={h.heroAlt} onChange={set('heroAlt')} disabled={!edit} /></Field>
      </section>
      <section className="adm-card"><h2>بخش‌های صفحه اصلی</h2>
        {h.sections.map((s: any, i: number) => <div key={s.key} className="adm-sec"><span>{i + 1}. {s.title}</span>
          {edit && <><Button sm aria-label="بالا" onClick={() => move(i, -1)} disabled={i === 0}>▲</Button><Button sm aria-label="پایین" onClick={() => move(i, 1)} disabled={i === h.sections.length - 1}>▼</Button></>}
          <label className="adm-check"><input type="checkbox" checked={s.visible} disabled={!edit} onChange={e => { const ss = [...h.sections]; ss[i] = { ...s, visible: e.target.checked }; setH({ ...h, sections: ss }); }} />
            <Badge tone={s.visible ? 'success' : 'neutral'}>{s.visible ? 'نمایش' : 'پنهان'}</Badge></label></div>)}
      </section></>}
    {tab === 'pages' && <><div className="adm-info">متن نهایی صفحات قانونی و سیاست‌ها توسط کسب‌وکار تأمین می‌شود (BD-02/03/04/14). تا انتشار، فروشگاه همان متن جایگزین فعلی را نشان می‌دهد.</div>
      <Table head={['صفحه', 'نشانی', 'وضعیت', 'آخرین تغییر', 'تصمیم مرتبط']}>{data.pages.map((p: any) => <tr key={p.slug} className="click" onClick={() => nav(`/admin/content/pages/${p.slug}`)}>
        <td><b>{p.title}</b></td><td dir="ltr" className="adm-muted">/info/{p.slug}</td><td><Badge tone={p.published ? 'success' : 'neutral'}>{p.published ? 'منتشر شده' : 'پیش‌نویس'}</Badge></td><td className="adm-muted">{when(p.updatedAt)}</td><td><Stub code={p.bd}>متن</Stub></td></tr>)}</Table></>}
  </>;
}
export function ContentPage() {
  const { slug } = useParams(); const me = useMe();
  const { data, error, loading, reload } = useLoad<any>(can(me, 'content') ? `/content/pages/${slug}` : null);
  const [p, setP] = useState<any>(null); const [errs, setErrs] = useState<Record<string, string>>({});
  useEffect(() => { if (data) setP(data); }, [data]);
  if (!can(me, 'content')) return <NoPermission />;
  if (loading && !p) return <Loading />; if (error) return error.status === 404 ? <Empty title="صفحه پیدا نشد" /> : <ErrorState retry={reload} />;
  const edit = can(me, 'content', 'edit');
  const save = async (published: boolean) => { setErrs({}); try { const r = await aapi(`/content/pages/${slug}`, { method: 'PUT', body: { ...p, published } }); setP(r.data); toast(published ? 'صفحه منتشر شد' : 'پیش‌نویس ذخیره شد'); } catch (e) { setErrs((e as AdminApiError).fields ?? {}); toast('ذخیره انجام نشد', true); } };
  if (!p) return null;
  return <>
    <PageTitle crumb={`محتوای سایت / صفحات و قوانین / ${p.title}`} title={p.title} sub={<><Badge tone={p.published ? 'success' : 'neutral'}>{p.published ? 'منتشر شده' : 'پیش‌نویس'}</Badge> · متن نهایی: <Stub code={p.bd} /></>}
      actions={edit && <><Button kind="primary" onClick={() => save(true)}>انتشار</Button><Button kind="secondary" onClick={() => save(false)}>{p.published ? 'لغو انتشار' : 'ذخیره پیش‌نویس'}</Button>
        <Link className="adm-btn" to={`/info/${slug}`} target="_blank">پیش‌نمایش ↗</Link></>} />
    <section className="adm-card">
      <Field label="عنوان" req err={errs.title}><input className="adm-input" value={p.title} onChange={e => setP({ ...p, title: e.target.value })} disabled={!edit} /></Field>
      <Field label="متن صفحه" req err={errs.body}><textarea className="adm-textarea" style={{ minHeight: 280 }} value={p.body} onChange={e => setP({ ...p, body: e.target.value })} disabled={!edit} /></Field>
      <span className="adm-muted">متن ساده (بدون قالب‌بندی). ویرایشگر متن غنی در فاز بعد.</span>
    </section>
  </>;
}
