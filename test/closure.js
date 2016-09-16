const assert = require('assert');
const Exval = require('../');
const { describe, it } = global;

describe('closure', () => {
  const exval = new Exval();

  describe('inner vars', () => {
    let a = 'hello!';

    it('should skip using "var a"', () => {
      const fn = () => a;

      const output = exval.stringify({ a: fn, b: fn });
      const obj = eval(`(${output})`);
      a = 'Gotcha!';

      assert.deepEqual(Object.getOwnPropertyNames(obj), ['a', 'b']);
      assert.equal(obj.a, obj.b);
      assert.equal(obj.a(), a);
    });
  });
});
