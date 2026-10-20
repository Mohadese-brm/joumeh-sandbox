// Engineering defaults (not business policy). Override with env vars; see .env.example (names only).
export const config = {
  port: Number(process.env.PORT ?? 3001),
  otpTtlSeconds: Number(process.env.OTP_TTL_SECONDS ?? 120),        // engineering default, not a BD value
  otpLength: 6,                                                       // Figma 107:941 «کد ۶ رقمی» / OTP Input 53:234
  otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),
  otpRequestsPerWindow: Number(process.env.OTP_REQUESTS_PER_WINDOW ?? 3),
  otpWindowSeconds: Number(process.env.OTP_WINDOW_SECONDS ?? 600),
  // Exposes the mock OTP code in the API response for local testing only. Never enable outside local dev.
  exposeDevOtp: process.env.NODE_ENV !== 'production',
  // R-1 DECIDED by the CEO (Mohadeseh, 2026-10-21 02:12 Tehran): discount badge = 20%. Env override kept for testing only.
  r1SampleBadgePercent: process.env.R1_SAMPLE_BADGE_PERCENT === 'none' ? null : Number(process.env.R1_SAMPLE_BADGE_PERCENT ?? 20),
  pageSize: 9, // Figma/KB: 9 items per page (3×3)
};
