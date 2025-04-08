import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactplugin from 'eslint-plugin-react';
import reacthooksplugin from 'eslint-plugin-react-hooks';

export default [
  eslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react': reactplugin,
      'react-hooks': reacthooksplugin
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'no-console': 'warn',
      ...tseslint.configs.recommended.rules,
      ...reactplugin.configs.recommended.rules,
      ...reacthooksplugin.configs.recommended.rules
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  }
]; 