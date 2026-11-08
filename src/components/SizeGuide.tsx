import { StoreContact } from './StoreContact';
// The owner's size chart (public/img/size-guide.webp), cropped out of the phone status bar.
// The numbers live in the image; they are not retyped here.
export function SizeGuide(_props: { name?: string; type?: string; sizes?: string[] }) {
  return (
    <div className="sg">
      <figure className="sg__fig">
        <img className="sg__img" src="/img/size-guide.webp" alt="راهنمای سایز محصولات منسوجات سنتی جومه. جدول سایزهای S تا XL با دور سینه، دور کمر و دور باسن." width={477} height={966} />
        <figcaption className="sr-only">راهنمای سایز</figcaption>
      </figure>
      <p className="small" style={{ margin: 0 }}>برای سؤال درباره سایز با فروشگاه تماس بگیرید.</p>
      <StoreContact />
    </div>
  );
}
export function SizeGuidePage() {
  return <div className="wrap" style={{ paddingBlock: 32, maxInlineSize: 760 }}><h1 className="h-page" style={{ marginBlockEnd: 16 }}>راهنمای سایز</h1><SizeGuide /></div>;
}
