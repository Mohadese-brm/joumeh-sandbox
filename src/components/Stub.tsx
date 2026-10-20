import { Icon } from './Icon';
/** Labelled business-decision stub. Never renders a policy value. */
export function Stub({ code, children }: { code: string; children?: React.ReactNode }) {
  return <p className="stub" data-bd={code}><Icon name="information-circle" size={20} /><span><strong>در انتظار تصمیم کسب‌وکار ({code})</strong>{children ? <> — {children}</> : null}</span></p>;
}
export function Placeholder({ title, figma, children }: { title: string; figma: string; children?: React.ReactNode }) {
  return (
    <section className="placeholder-screen" data-placeholder={title}>
      <span className="tag-sample">صفحه‌ی موقت — طراحی نشده</span>
      <h1 className="h-section">{title}</h1>
      <p className="small muted">این صفحه در فیگما طراحی نشده است ({figma}). نسخه‌ی ساده و موقت برای بازبینی طراحی (Emma).</p>
      {children}
    </section>
  );
}
