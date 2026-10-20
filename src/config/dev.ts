// Dev-only switches. Both are compile-time constants: in a production `vite build` (DEV=false, VITE_SHOW_DEV_OTP unset)
// the demo-code box is dead code and is removed from the bundle. Tests (vitest, DEV=true) and local dev see it.
export const devFlags = {
  /** Round 2 (R1-4): show the mock SMS/e-mail code box (BD-13/BD-21) in the code step. Never on in production builds. */
  showDevOtpBox: import.meta.env.DEV || import.meta.env.VITE_SHOW_DEV_OTP === '1',
};
