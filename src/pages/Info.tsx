import { useParams } from 'react-router-dom';
import { Placeholder, Stub } from '../components/Stub';
// Footer/info pages are not designed (except size guide 245:61044 and FAQ/support 246:*) → flagged placeholders.
const PAGES: Record<string, [string, string]> = {
  shipping: ['ارسال و تحویل', 'BD-02/BD-03'], returns: ['بازگشت کالا', 'BD-04'], 'size-guide': ['راهنمای سایز', 'BD-18'], faq: ['پرسش‌های متداول', 'BD-12'],
  contact: ['تماس با ما', 'BD-12'], careers: ['همکاری', 'BD-14'], blog: ['وبلاگ', 'BD-14'], story: ['قصه‌ی ما', 'BD-14'],
};
export function Info() {
  const { slug = '' } = useParams(); const p = PAGES[slug] ?? ['صفحه', 'BD-14'];
  return <div className="wrap" style={{ paddingBlock: 32 }}><Placeholder title={p[0]} figma="no frame"><Stub code={p[1]}>محتوای این صفحه پس از تصمیم کسب‌وکار و طراحی اضافه می‌شود.</Stub></Placeholder></div>;
}
