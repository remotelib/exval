const assert = require('assert');
const Exval = require('../');
const { describe, it } = global;

describe('Refs', () => {
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

  // TODO test multiple refs
});
