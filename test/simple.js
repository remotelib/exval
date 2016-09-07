const assert = require('assert');
const Exval = require('../');
const { describe, it } = global;

describe('Simple', () => {
  const exval = new Exval();

  function itEval(itFn, code, obj) {
    itFn(`should un-eval \`${code}\``, () => {
      assert.equal(exval.stringify(obj || eval(`(${code})`)), code);
    });
  }

  describe('Number', () => {
    itEval(it, '1');
    itEval(it, '-2');
    itEval(it, '0');
    itEval(it, '0.19336260607070122');
    itEval(it, '4e+35');
    itEval(it, '6e-26');
    itEval(it, 'NaN');
    itEval(it, 'Infinity');
    itEval(it, '-Infinity');
  });

  describe('Undefined', () => {
    itEval(it, 'undefined');
  });

  describe('String', () => {
    itEval(it, '\'Foo\'');
    itEval(it, '\'Foo Bar\'');
    itEval(it, '\'Foo \\\'Bar\'');
    itEval(it, '\'Foo \\\'\\\'Bar\'');
    itEval(it, '\'Foo "Bar\'');
  });

  describe('Boolean', () => {
    itEval(it, 'true');
    itEval(it, 'false');
  });

  describe('Object', () => {
    itEval(it, 'null');
    itEval(it, '{}');
    itEval(it, '{foo:1}');
    itEval(it, '{foo:1,bar:2}');
    itEval(it, '{foo:\'bar\'}');
    itEval(it, '{\'foo-bar\':false,dd:null}', { 'foo-bar': false, dd: null });
    itEval(it, '{foo:undefined}');
  });

  // TODO add this
  // describe('Array', () => {
  //   itEval(it, '[]');
  //   itEval(it, '[\'foo\']');
  //   itEval(it, '[1,2,3]');
  //   itEval(it, 'new Array(100)');
  // });
});
