const expoConfig = require('eslint-config-expo/flat.js');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/**', 'dist2/**', 'src/.legacy-screens/**', '.scratch/**'],
  },
];
