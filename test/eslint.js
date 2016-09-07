const eslint = require('mocha-eslint');

const paths = [
  '*.js',
  'test',
];

eslint(paths, {
  alwaysWarn: false,
  timeout: 5000,
});
