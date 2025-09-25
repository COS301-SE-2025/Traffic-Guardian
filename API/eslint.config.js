module.exports = [
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      // Console rules - allow for server logging
      'no-console': 'off',
      'no-debugger': 'error',

      // Code quality
      'prefer-const': 'error',
      'no-var': 'error',
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],

      // Best practices
      'eqeqeq': ['error', 'always'],
      'curly': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-return-assign': 'error',
      'no-sequences': 'error',
      'no-throw-literal': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-use-before-define': ['error', { functions: false }],
      'consistent-return': 'error',
      'default-case': 'warn',
      'dot-notation': 'error',
      'no-else-return': 'warn',
      'no-empty-function': 'warn',
      'no-magic-numbers': ['warn', {
        ignore: [0, 1, -1],
        ignoreArrayIndexes: true,
        detectObjects: false,
      }],
      'no-multi-spaces': 'error',
      'no-param-reassign': 'warn',
      'no-redeclare': 'error',
      'no-useless-concat': 'error',
      'no-useless-return': 'error',
      'prefer-arrow-callback': 'warn',

      // Style
      'semi': ['error', 'always'],
      'quotes': ['warn', 'single', { avoidEscape: true }],
      'comma-dangle': ['warn', 'always-multiline'],
      'indent': ['warn', 2, { SwitchCase: 1 }],
      'max-len': ['warn', { code: 120, ignoreUrls: true }],
      'brace-style': ['warn', '1tbs', { allowSingleLine: true }],
      'comma-spacing': ['warn', { before: false, after: true }],
      'key-spacing': ['warn', { beforeColon: false, afterColon: true }],
      'no-trailing-spaces': 'warn',
      'object-curly-spacing': ['warn', 'always'],
      'space-before-blocks': 'warn',
      'space-infix-ops': 'warn',

      // Imports
      'no-duplicate-imports': 'error',

      // Security
      'no-new-wrappers': 'error',
      'no-script-url': 'error',
    },
  },
  {
    files: ['**/*.test.js', '**/*.spec.js'],
    rules: {
      'no-magic-numbers': 'off',
    },
  },
];