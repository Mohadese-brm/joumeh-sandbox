// BD-01 STUB — awaiting business decision (owner: CEO). Do not ship as policy.
// Only the MockProvider exists. No real PSP, no network calls, no money moves.
export interface PaymentProvider { name: string; start(orderId: number, amount: number): { ref: string; redirectUrl: string }; verify(ref: string, outcome: 'success' | 'failure'): 'paid' | 'failed' }
export class MockProvider implements PaymentProvider {
  name = 'mock';
  start(orderId: number) { const ref = `MOCK-${orderId}-${Date.now()}`; return { ref, redirectUrl: `/checkout/payment?order=${orderId}&ref=${ref}` }; }
  verify(_ref: string, outcome: 'success' | 'failure') { return outcome === 'success' ? 'paid' as const : 'failed' as const; }
}
