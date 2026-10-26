// design-batch-2026-10-26: the existing suites test the bare real catalogue; placeholder data has its own test (sample-placeholders.test.ts).
process.env.JOUMEH_SAMPLE_PLACEHOLDERS ??= '0';
process.env.JOUMEH_BCRYPT_COST ??= '4'; // admin-v1: fast hashing in tests only (default cost 12)
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(() => cleanup());
import { expect } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);
if (typeof window !== 'undefined') window.scrollTo = () => {};
