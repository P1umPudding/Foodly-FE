// Lint = conventions from CLAUDE.md / docs/architecture.md that tooling can check, plus promise
// and hook bugs. No style rules: Prettier owns formatting. Existing violations are counted in
// eslint-suppressions.json (bulk suppressions); new code must be clean. Run: npm run lint
import importX from 'eslint-plugin-import-x'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const TEST_FILES = ['src/**/*.test.{ts,tsx}', 'src/test/**']
const CONFIG_FILES = ['*.config.{js,cjs,ts}']
const NATIVE_FILES = ['src/native/**']

export default tseslint.config(
  // android/ and ios/ are generated Capacitor projects, plus the web build copied in by `cap sync`.
  { ignores: ['dist/', 'node_modules/', 'android/', 'ios/'] },
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },

  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: globals.browser,
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooks,
      react,
      'import-x': importX,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      // Every import must be declared in package.json; devDependencies only in tests.
      'import-x/no-extraneous-dependencies': ['error', { devDependencies: false }],
      // CLAUDE.md: Tailwind instead of inline styles, postxl Tooltip instead of title="".
      // (The --cat-* helper is spread as props, which this rule does not see.)
      'react/forbid-dom-props': ['error', { forbid: ['style', 'title'] }],
      // CLAUDE.md: interactive UI comes from @postxl/ui-components.
      'react/forbid-elements': [
        'error',
        {
          forbid: ['button', 'input', 'select', 'textarea', 'dialog'].map((element) => ({
            element,
            message: 'use the @postxl/ui-components equivalent (CLAUDE.md, UI / styling conventions)',
          })),
        },
      ],
      // ADR 0005: native APIs only behind the adapters in src/native/ (static imports; dynamic import() by convention).
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@capacitor/*', '@capacitor-community/*'],
              message: 'Capacitor is only used in src/native/ (docs/decisions/0005-native-shell.md).',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "TSAsExpression[typeAnnotation.typeName.name='Error']",
          message: '`as Error` hides non-Error throws; read the message through a shared helper instead.',
        },
        {
          // Whatever an expression-bodied effect callback evaluates to goes to React as its cleanup (#211).
          selector:
            "CallExpression:matches([callee.name=/^use(Layout|Insertion)?Effect$/], [callee.property.name=/^use(Layout|Insertion)?Effect$/]) > ArrowFunctionExpression[body.type!='BlockStatement']",
          message:
            'An expression-bodied effect callback hands its value to React as the cleanup; use a block body (and an explicit `return` for a real cleanup).',
        },
        {
          // Without it React Router 7 runs navigations in startTransition (no lazy-route skeleton, lagging
          // re-renders); tests must match the app (#297).
          selector:
            "JSXOpeningElement[name.name=/^(Browser|Memory)Router$/]:not(:has(JSXAttribute[name.name='useTransitions'][value.expression.value=false]))",
          message: 'Set useTransitions={false} on every router, like src/main.tsx (keeps the v6 navigation behaviour).',
        },
      ],
    },
  },

  {
    files: TEST_FILES,
    rules: {
      'import-x/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'react/forbid-dom-props': 'off',
      'react/forbid-elements': 'off',
    },
  },

  {
    files: NATIVE_FILES,
    rules: { 'no-restricted-imports': 'off' },
  },

  {
    files: CONFIG_FILES,
    languageOptions: { parser: tseslint.parser, globals: globals.node },
    plugins: { 'import-x': importX },
    rules: { 'import-x/no-extraneous-dependencies': ['error', { devDependencies: true }] },
  },
)
