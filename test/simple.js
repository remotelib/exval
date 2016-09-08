const assert = require('assert');
const Exval = require('../');
const { describe, it } = global;

describe('Simple', () => {
  const exval = new Exval();

  function itEval(code, obj = eval(`(${code})`)) {
    it(`should un-eval \`${code}\``, () => {
      assert.equal(exval.stringify(obj), code);
    });
  }

  describe('Number', () => {
    itEval('1');
    itEval('-2');
    itEval('0');
    itEval('0.19336260607070122');
    itEval('4e+35');
    itEval('6e-26');
    itEval('NaN');
    itEval('Infinity');
    itEval('-Infinity');
  });

  describe('Undefined', () => {
    itEval('undefined');
  });

  describe('String', () => {
    itEval('\'Foo\'');
    itEval('\'Foo Bar\'');
    itEval('\'Foo \\\'Bar\'');
    itEval('\'Foo \\\'\\\'Bar\'');
    itEval('\'Foo "Bar\'');
  });

  describe('Boolean', () => {
    itEval('true');
    itEval('false');
  });

  describe('Object', () => {
    itEval('null');
    itEval('{}');
    itEval('{foo:1}');
    itEval('{foo:1,bar:2}');
    itEval('{foo:\'bar\'}');
    itEval('{\'foo-bar\':false,dd:null}', { 'foo-bar': false, dd: null });
    itEval('{foo:undefined}');
  });

  // TODO test array
  describe('Array', () => {
    // itEval('[]');
    // itEval('[\'foo\']');
    // itEval('[1,2,3]');
    // itEval('new Array(100)');
  });

  // TODO test functions and methods
});
