const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const typescriptPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = defineConfig([
  ...expoConfig,
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/exhaustive-deps': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^(_|error|err|e)', 
        varsIgnorePattern: '^(_|error|err|e)',
        caughtErrorsIgnorePattern: '^(_|error|err|e)',
      }],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'import/first': 'off',
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'import/no-duplicates': 'off',
      'no-unreachable': 'off',
    },
  },
  {
    // Test files and declaration files can have unused variables/imports safely
    files: ['**/__tests__/**/*.{ts,tsx,js,jsx}', '**/*.d.ts', 'e2e/**/*.{ts,js}'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    // Supabase Edge Functions use Deno runtime with URL imports
    files: ['**/supabase/functions/**/*.ts'],
    rules: {
      'import/no-unresolved': 'off',
      'no-console': 'off',
    },
  },
  {
    // k6 load tests use their own module system
    files: ['load-tests/**/*.js'],
    rules: {
      'import/no-unresolved': 'off',
      'no-undef': 'off',
    },
  },
  {
    // E2E tests use detox
    files: ['e2e/**/*.{ts,js}'],
    rules: {
      'import/no-unresolved': 'off',
      'no-undef': 'off',
    },
  },
  {
    // Debug/utility scripts are allowed console.log
    files: ['scripts/**/*.{ts,mjs,js}'],
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },
]);
