const assert = require('assert');
const Exval = require('../');
const { describe, it } = global;

describe('refs', () => {
  const exval = new Exval();

  function itEval(code, obj = eval(`(${code})`)) {
    it(`should un-eval \`${code}\``, () => {
      assert.equal(exval.stringify(obj), code);
    });
  }

  describe('Class', () => {
    itEval('Number');
    itEval('Map');
    itEval('Math');
    itEval('Object');
    itEval('Buffer');
  });

  describe('Object', () => {
    itEval('global');
    itEval('Object.prototype');
    itEval('Map.prototype');
    itEval('Buffer.prototype');

    // TODO add node libs
    // itEval('fs');
  });

  describe('Function', () => {
    itEval('Math.pow');
    itEval('Object.prototype.toString');
    itEval('Object.getPrototypeOf');
    itEval('(function*(){})().constructor');
    itEval('(function*(){})().next');
  });

  describe('Deep-ref', () => {
    itEval('{foo:Math.pow}');

    it('should un-eval self-loop `obj{ sub: obj }`', () => {
      const obj = {};
      obj.sub = obj;

      const output = exval.stringify(obj);
      const obj2 = eval(`(${output})`);

      assert.deepEqual(Object.getOwnPropertyNames(obj2), ['sub']);
      assert.equal(obj2.sub, obj2);
    });

    it('should un-eval close-loop `a { b }, b { a }`', () => {
      const a = {};
      const b = { a };
      a.b = b;

      const output = exval.stringify({ a, b });
      const obj = eval(`(${output})`);

      assert.deepEqual(Object.getOwnPropertyNames(obj), ['a', 'b']);
      assert.deepEqual(Object.getOwnPropertyNames(obj.a), ['b']);
      assert.deepEqual(Object.getOwnPropertyNames(obj.b), ['a']);
      assert.equal(obj.a.b, obj.b);
      assert.equal(obj.b.a, obj.a);
    });
  });
});
