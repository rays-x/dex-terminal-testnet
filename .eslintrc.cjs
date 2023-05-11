module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'airbnb-base',
    'airbnb-typescript/base',
    'prettier',
    'plugin:@darraghor/nestjs-typed/recommended',
    'plugin:@darraghor/nestjs-typed/no-swagger',
  ],
  plugins: ['prettier', '@darraghor/nestjs-typed'],
  parserOptions: {
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  env: {
    es2022: true,
    node: true,
  },
  rules: {
    'prettier/prettier': [
      'warn',
      {
        singleQuote: true,
        semi: true,
      },
    ],
    'import/prefer-default-export': 'off',
    'no-await-in-loop': 'off',
    'import/no-named-as-default': 'off',
    'no-console': 'warn',
    'no-plusplus': 'off',
    'class-methods-use-this': 'off',
    'no-continue': 'off',
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.ts'],
        moduleDirectory: ['src', 'node_modules'],
      },
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts'],
    },
  },
  ignorePatterns: ['src/generated/**/*'],
};
