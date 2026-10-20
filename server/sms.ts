// BD-13 STUB — SMS provider & templates undecided. Console adapter only; nothing is sent.
export interface SmsAdapter { sendOtp(phone: string, code: string): void }
export class ConsoleSmsAdapter implements SmsAdapter {
  sent: { phone: string; at: number }[] = [];
  sendOtp(phone: string, code: string) {
    this.sent.push({ phone, at: Date.now() });
    if (process.env.NODE_ENV !== 'test') console.log(`[mock-sms BD-13] OTP for ${phone.slice(0, 4)}***${phone.slice(-2)}: ${code}`);
  }
}
