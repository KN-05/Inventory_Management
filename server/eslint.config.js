// eslint.config.js - lint rules for the Express server (CommonJS, Node).
// Run:  npm run lint
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/**', 'uploads/**'] },
  js.configs.recommended,
  // the code base marks ordered awaits with eslint-disable comments; don't nag about them
  { linterOptions: { reportUnusedDisableDirectives: 'off' } },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      // real bugs
      'no-unused-vars': ['warn', { argsIgnorePattern: '^(_|next$|req$|res$)', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-dupe-keys': 'error',
      'eqeqeq': ['warn', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'warn',
      // the code base awaits inside loops on purpose (ordered DB writes)
      'no-await-in-loop': 'off',
      // style-only: asks to attach `cause` when re-throwing a caught error
      'preserve-caught-error': 'off',
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];
