import globals from 'globals';
import rootConfig from '../../eslint.config.js';

export default [
  ...rootConfig,
  {
    ignores: ['eslint.config.js'],
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
