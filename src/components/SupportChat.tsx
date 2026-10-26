import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { DEMO_ANSWERS, DEMO_FALLBACK, DEMO_LABEL } from '../content/support-demo';
import './SupportChat.css';
/** design-batch-2026-10-26 item 13 — call/support button on every page (Figma icon pack «Call») opening a LOCAL DEMO chat.
 *  Nothing is sent anywhere: suggested questions + canned answers from src/content/support-demo.ts, each answer marked «پاسخ نمایشی».
 *  FIGMA GAP: no chat frame → reuses the accessible Modal (focus trap, Esc, focus restore; bottom sheet on mobile). */
type Msg = { from: 'user' | 'bot'; text: string; link?: { to: string; label: string } };
export function SupportChat() {
  const [open, setOpen] = useState(false); const [msgs, setMsgs] = useState<Msg[]>([]); const [text, setText] = useState(''); const [typing, setTyping] = useState(false);
  const log = useRef<HTMLDivElement>(null); const timer = useRef<number>();
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [msgs, typing]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const ask = (q: string) => {
    const qq = q.trim(); if (!qq || typing) return;
    const hit = DEMO_ANSWERS.find(a => a.q === qq) ?? DEMO_FALLBACK;
    setMsgs(m => [...m, { from: 'user', text: qq }]); setText(''); setTyping(true);
    timer.current = window.setTimeout(() => { setMsgs(m => [...m, { from: 'bot', text: hit.a, link: hit.link }]); setTyping(false); }, 450);
  };
  return (<>
    <button type="button" className="sfab" aria-label="پشتیبانی و تماس (گفت‌وگوی نمایشی)" aria-haspopup="dialog" onClick={() => setOpen(true)} data-testid="support-fab"><Icon name="call" size={24} /></button>
    {open && <Modal title="پشتیبانی جومه" onClose={() => setOpen(false)} labelId="chat-title" sheet>
      <div className="chat" data-testid="support-chat">
        <p className="chat__demo" role="note"><Icon name="information-circle" size={20} /><span>این گفت‌وگو نمایشی (دمو) است؛ پیامی برای کسی ارسال نمی‌شود و پاسخ‌ها از پیش نوشته شده‌اند.</span></p>
        <div className="chat__log" ref={log} role="log" aria-live="polite" aria-label="پیام‌ها">
          <div className="chat__msg chat__msg--bot"><span className="chat__tag">{DEMO_LABEL}</span><p>سلام! یکی از پرسش‌های زیر را انتخاب کنید یا سؤالتان را بنویسید.</p></div>
          {msgs.map((m, i) => <div key={i} className={`chat__msg chat__msg--${m.from}`}>{m.from === 'bot' && <span className="chat__tag">{DEMO_LABEL}</span>}<p>{m.text}</p>
            {m.link && <Link to={m.link.to} className="chat__link" onClick={() => setOpen(false)}>{m.link.label}</Link>}</div>)}
          {typing && <div className="chat__msg chat__msg--bot chat__typing" aria-label="در حال نوشتن"><span /><span /><span /></div>}
        </div>
        <ul className="chat__sugg" aria-label="پرسش‌های پیشنهادی">{DEMO_ANSWERS.map(a => <li key={a.q}><button type="button" className="chat__chip" onClick={() => ask(a.q)} disabled={typing} data-autofocus={a === DEMO_ANSWERS[0] || undefined}>{a.q}</button></li>)}</ul>
        <form className="chat__form" onSubmit={e => { e.preventDefault(); ask(text); }}>
          <label htmlFor="chat-in" className="sr-only">پیام شما</label>
          <input id="chat-in" className="chat__in" value={text} onChange={e => setText(e.target.value)} placeholder="پیام خود را بنویسید…" maxLength={300} autoComplete="off" />
          <button type="submit" className="chat__send" aria-label="ارسال پیام (نمایشی)" disabled={!text.trim() || typing}><Icon name="send-1" size={24} /></button>
        </form>
      </div>
    </Modal>}
  </>);
}
