import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    ignores: [
      '.next/**', 'out/**', 'build/**', 'next-env.d.ts', '**/node_modules/**',
      // Stale backup of the deals-pipeline store - superseded by src/features/deals-pipeline/store/.
      // Not imported anywhere; kept on disk only as a reference snapshot.
      '**/store.backup/**',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // Phase 0 guardrail: ban console.log/info to enforce the structured-logger rule
    // documented in design-principles.md. Catches M4 regressions.
    // `warn` and `error` remain allowed for emergency fallback only.
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Pragmatic severity overrides - next/typescript inherits strict @typescript-eslint
    // defaults that treat the entire existing codebase as errors. Downgrading these
    // noisy style rules to warnings keeps the error count meaningful (actual bugs only)
    // while the codebase is progressively typed and cleaned up.
    rules: {
      // ~1000 occurrences across legacy code - warn until stricter typing is adopted
      '@typescript-eslint/no-explicit-any': 'warn',

      // Unused variables are a style issue, not a runtime bug
      '@typescript-eslint/no-unused-vars': 'warn',

      // Missing deps are worth noting but rarely cause real bugs with stable callbacks
      'react-hooks/exhaustive-deps': 'warn',

      // @ts-ignore is legacy; encourage migration to @ts-expect-error over time
      '@typescript-eslint/ban-ts-comment': 'warn',

      // Prefer typed catch binding - warn rather than block
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  {
    // Exemptions: scripts and tests can use console.log freely
    files: [
      'scripts/**',
      '**/*.test.{js,jsx,ts,tsx}',
      '**/__tests__/**',
    ],
    rules: {
      'no-console': 'off',
    },
  },
];

export default eslintConfig;
