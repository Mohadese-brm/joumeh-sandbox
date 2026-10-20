# Fixes — round 3 (Emma's «Round 2 verification», 2026-10-21)
Status: **Review**. Figma read-only. Local commit only; no push or deploy.

## Results (production build, `vite preview` + local API started with the explicit opt-in `npm run api:demo`)
- tsc clean · build OK · vitest **63/63** (+6: demo-OTP opt-in rules ×5, Vercel handler never returns a code ×1)
- Playwright + axe: **76 renders, 0 violations**, 0 unexpected console errors, no overflow
- Browser flow **27/27** (new: on mobile, the auth dialogs are a centred 343px card with no handle, while the filter stays a full-width bottom sheet)
- Manual check: the API started **without** the flag returns no `devCode` and logs no code (`{"data":{"phone":…,"expiresIn":120,"resendIn":120,"codeLength":6},…}`; 0 `mock-sms` log lines).

## Items
| # | Item | Status | Change | Evidence |
|---|---|---|---|---|
| R2-1 (Major) | Mobile auth modals | FIXED | Sign-in, signup (mobile + email) and code step are no longer sheets. On ≤767px they are a centred card, `min(343px, 100%)` wide, 16px margin on all sides, all corners rounded, no drag handle (108:6003; 107:1247 / 107:1375 / 107:1543). Confirm dialogs (logout, delete address) follow the same rule. Only filter, sort and size guide stay bottom sheets. | `auth-modal-mobile`, `signup-mobile`, `signup-error-mobile`, `signup-email-mobile`, `auth-code-mobile`; flow geometry step |
| R2-2 (Security) | Demo OTP exposure | FIXED | `config.demoOtp` = `JOUMEH_DEMO_OTP === '1'` only. It no longer depends on `NODE_ENV`, so it is OFF by default everywhere. `createApp(db, { demoOtp })` lets tests opt in explicitly. The Vercel handler `api/index.ts` forces `demoOtp: false`, even if the variable is set. Code logging (SMS console adapter, mock e-mail) follows the same flag, so no codes in logs by default. `vercel.json` is unchanged and sets nothing. `.env.example` documents the name only. Local opt-in: `npm run api:demo`. The e2e scripts exit with an error if the API isn't in demo mode. The front-end demo box is still dev-build-only (round 2). | `tests/api.test.ts` «demo OTP is opt-in only» (unset, NODE_ENV=production, NODE_ENV=development, `=true` rejected, `=1` accepted, e-mail); `tests/api-vercel.test.ts` (no code with `JOUMEH_DEMO_OTP=1`); manual curl above |

## Changed screenshots
Visibly changed (mobile only): `auth-modal-mobile`, `signup-mobile`, `signup-error-mobile`, `signup-email-mobile`, `auth-code-mobile`. All 76 were retaken; desktop is unchanged.

## Note
- The email-tab helper line in signup mode still reads «ورود با ایمیل آزمایشی است (BD-21)…» (login wording). Signup by email remains a BD-21 stub.

## R3-1 (Minor, after Emma's sign-off) — FIXED
- In signup mode the email-tab helper line is removed entirely (107:812 / 107:709 have none). The sign-in email tab keeps it. The BD-21 stub behaviour is unchanged (signup by email shows the labelled BD-21 note after submit).
- Evidence: `signup-email-desktop.png`, `signup-email-mobile.png`, retaken together with auth-modal / signup / signup-error: 8 renders, axe 0, console 0. Component test asserts the line is absent in signup mode. vitest 63/63. `results.json` is from the full round-3 run.
- Release check: `npm run build` OK. `.gitignore` excludes `node_modules`, `dist`, `coverage` and `.env*` (except `.env.example`, which lists names only). None of them are tracked. `vercel.json` (vite, dist, `/api` rewrite, sql.js wasm include) and `api/index.ts` are present; the demo OTP is forced off there. A secret-pattern scan of tracked files found nothing. Not deployed or pushed.
