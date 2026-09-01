import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import importPlugin from 'eslint-plugin-import'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'src/data/**/*.json'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.app.json',
        },
      },
    },
    rules: {
      // アーキテクチャ制約（plan.md §2、advisor 承認条件①）
      // core/ は React コンポーネント層（ui/）へ依存してはならない。依存は常に ui → core の一方向。
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/core',
              from: './src/ui',
              message:
                'src/core は src/ui に依存してはならない（plan.md §2, ui→core の一方向依存）。',
            },
          ],
        },
      ],
    },
  },
  {
    // src/core/ 配下は純粋 TypeScript のみ。react 系モジュールの import も禁止する。
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-dom',
                'react/*',
                'react-dom/*',
                'zustand',
                'zustand/*',
                '@/ui/*',
                '../ui/*',
                '../../ui/*',
              ],
              message:
                'src/core は UI 依存（react/react-dom/zustand/src/ui）を import してはならない（plan.md §2）。',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  eslintConfigPrettier,
)
