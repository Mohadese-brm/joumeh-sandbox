/** DEMO ONLY (design-batch-2026-10-26 item 13). Canned answers for the local support chat. They must not state any shipping, returns,
 *  payment or stock policy — those are open business decisions (BD-02/03/04/16), so the answers say so and point to existing pages. */
export const DEMO_LABEL = 'پاسخ نمایشی (دمو)';
export const DEMO_ANSWERS: { q: string; a: string; link?: { to: string; label: string } }[] = [
  { q: 'سفارشم کجاست؟', a: 'پس از ورود به حساب کاربری، وضعیت سفارش‌ها در بخش «سفارش‌ها» دیده می‌شود.', link: { to: '/account/orders', label: 'سفارش‌های من' } },
  { q: 'سایز مناسبم را چطور انتخاب کنم؟', a: 'جدول اندازه‌ها در صفحه‌ی راهنمای سایز آمده است.', link: { to: '/info/size-guide', label: 'راهنمای سایز' } },
  { q: 'هزینه و زمان ارسال چقدر است؟', a: 'اطلاعات ارسال هنوز نهایی نشده است و پس از تصمیم کسب‌وکار اعلام می‌شود.' },
  { q: 'شرایط بازگشت کالا چیست؟', a: 'شرایط بازگشت کالا هنوز نهایی نشده است و پس از تصمیم کسب‌وکار اعلام می‌شود.' },
  { q: 'قصه‌ی جومه چیست؟', a: 'قصه‌ی ما را در صفحه‌ی «قصه‌ی ما» بخوانید.', link: { to: '/info/story', label: 'قصه‌ی ما' } },
];
export const DEMO_FALLBACK = { q: '', a: 'این یک گفت‌وگوی نمایشی است و پیام شما برای کسی ارسال نشد. برای راه‌های ارتباطی به صفحه‌ی پشتیبانی بروید.', link: { to: '/support/contact', label: 'تماس با پشتیبانی' } };
