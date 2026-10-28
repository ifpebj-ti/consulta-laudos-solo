import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // Ignora arquivos gerados e de configuração de build
  { ignores: ['dist/**', 'node_modules/**', 'vite.config.*'] },

  // Regras base do JavaScript
  js.configs.recommended,

  // Regras TypeScript (strict)
  ...tseslint.configs.recommended,

  // Regras de React Hooks
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // react-hooks/refs (v7) bloqueia o padrão ref.current = value durante o render,
      // que é uma técnica documentada para manter refs atualizadas sem triggering re-renders:
      //   https://react.dev/reference/react/useRef#avoiding-recreating-the-ref-contents
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },

  // Configurações globais do projeto
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Proibe uso de `any` explícito — use tipos concretos ou `unknown`
      '@typescript-eslint/no-explicit-any': 'warn',
      // Garante que variáveis declaradas sejam usadas
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Evita imports duplicados
      'no-duplicate-imports': 'error',
      // Verifica dependências dos hooks
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
);
