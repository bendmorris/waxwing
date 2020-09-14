module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: [
      '@typescript-eslint',
    ],
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
    ],
    env: {
      'node': true,
    },
    rules: {
        'no-fallthrough': 0,
        '@typescript-eslint/no-this-alias': 0,
        '@typescript-eslint/no-inferrable-types': 0,
    }
};
