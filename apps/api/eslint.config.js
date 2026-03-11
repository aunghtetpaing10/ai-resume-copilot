import globals from 'globals';
import rootConfig from '../../eslint.config.js';

export default [
  ...rootConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
