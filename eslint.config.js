// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const prettier = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'hks',
          style: 'camelCase'
        }
      ],
      // the board is drawn on the canvas it is attached to
      '@angular-eslint/component-selector': [
        'error',
        {
          type: ['element', 'attribute'],
          prefix: 'hks',
          style: 'kebab-case'
        }
      ],
      // the code uses type aliases throughout, they also cover unions and tuples
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      // more than one condition reads better as early returns
      'no-nested-ternary': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      // leaving out a field with ({ field, ...rest }) is intended
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }]
    }
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {}
  },
  // formatting is Prettier's job
  prettier
]);
