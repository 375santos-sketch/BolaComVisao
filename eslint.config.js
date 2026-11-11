import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'public/**',
      '*.config.js',
      '*.config.ts',
      'server.js',
      'dist/**',
      '.github/**',
      '.aistudio/**',
      'firebase-applet-config.json'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      'no-empty': ['warn', { allowEmptyCatch: false }]
    }
  },
  // Design system (M1): the redesigned screens take colours only from the app's tokens (bg-ui-*, text-ui-*…),
  // never from Tailwind's palette or hex values. Each module joins this list when it is redesigned.
  {
    files: [
      'src/components/ui/StatTile.tsx',
      'src/components/ui/SectionHeader.tsx',
      'src/components/ui/EmptyState.tsx',
      'src/components/ui/Sheet.tsx',
      'src/components/ui/Field.tsx',
      'src/components/dashboard/HomeOverview.tsx',
      'src/components/dashboard/TodayFocusCard.tsx',
      'src/components/trends/GoalsLineChart.tsx'
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Literal[value=/(^|[\\s:])(bg|text|border|ring|from|to|via|fill|stroke|outline|divide)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(-\\d|\\/|\\s|$)/]',
          message: 'Use as cores do Design System (ui-brand, ui-text, ui-muted, ui-success…), não a paleta do Tailwind.'
        },
        {
          selector:
            'TemplateElement[value.raw=/(^|[\\s:])(bg|text|border|ring|fill|stroke|outline|divide)-(slate|gray|zinc|red|orange|amber|yellow|green|emerald|cyan|sky|blue|violet|purple|fuchsia|pink|rose|white|black)(-\\d|\\/|\\s|$)/]',
          message: 'Use as cores do Design System (ui-brand, ui-text, ui-muted, ui-success…), não a paleta do Tailwind.'
        }
      ]
    }
  },
  prettierConfig
);
