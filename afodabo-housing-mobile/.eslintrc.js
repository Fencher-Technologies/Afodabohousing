module.exports = {
  extends: ['expo', 'prettier'],
  plugins: ['prettier', 'react-native'],
  rules: {
    'prettier/prettier': 'error',
    'react-native/no-unused-styles': 'warn',
    'react-native/split-platform-components': 'warn',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'warn',
  },
  env: {
    'react-native/react-native': true,
  },
};
