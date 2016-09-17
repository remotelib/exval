const assert = require('assert');
const Exval = require('../');
const { describe, it } = global;

describe('Demo', () => {
  const exval = new Exval();

  describe('README Simple Object', () => {
    it('should works', () => {
      const obj = {
        foo: 'bar',
        deep: {
          hello: 'world',
        },
        pow: Math.pow,
      };

      const output = exval.stringify(obj);
      assert.equal(output, "{foo:'bar',deep:{hello:'world'},pow:Math.pow}");

      const obj2 = eval(`(${output})`);
      assert(obj2 !== obj);
      assert(obj2.deep !== obj.deep);
      assert.deepEqual(obj2, obj);
    });
  });

  describe('README Class Instance', () => {
    it('should work on ES5', () => {
      const c1 = (() => {
        function Counter(init) {
          this.counter = init;
        }

        Counter.prototype.inc = function inc(a) {
          this.counter += a;
        };

        return new Counter(100);
      })();

      assert.equal(typeof Counter, 'undefined');

      c1.inc(2);
      c1.foo = 'bar';

      const output = exval.stringify(c1);
      const c2 = eval(`(${output})`);

      assert.equal(typeof Counter, 'undefined');
      assert.equal(c2.counter, c1.counter);
      assert.equal(c2.foo, c1.foo);

      c2.inc(1);
      assert.equal(c2.counter, 103);

      assert.equal(c1.counter, 102);
    });

    it('should work on ES6', () => {
      const c1 = (() => {
        class Counter {
          constructor(init) {
            this.counter = init;
          }

          inc(a) {
            this.counter += a;
          }
        }

        return new Counter(100);
      })();

      assert.equal(typeof Counter, 'undefined');

      c1.inc(2);
      c1.foo = 'bar';

      const output = exval.stringify(c1);
      const c2 = eval(`(${output})`);

      assert.equal(typeof Counter, 'undefined');
      assert.equal(c2.counter, c1.counter);
      assert.equal(c2.foo, c1.foo);

      c2.inc(1);
      assert.equal(c2.counter, 103);

      assert.equal(c1.counter, 102);
    });
  });

  describe('README Multiple References', () => {
    it('should works', () => {
      const a = { name: 'a' };

      const obj = {
        a1: a,
        a2: a,
      };

      const output = exval.stringify(obj);
      assert.equal(output, "function(){var a={name:'a'};return {a1:a,a2:a}}()");

      const obj2 = eval(`(${output})`);
      assert.deepEqual(obj2, obj);
      assert(obj2.a1 === obj2.a2);
    });
  });

  describe('README Close Loop References', () => {
    it('should works', () => {
      const obj = { foo: 'bar' };
      obj.obj = obj;

      const output = exval.stringify(obj);
      const obj2 = eval(`(${output})`);

      assert(obj2 !== obj);
      assert(obj2.foo === obj.foo);
      assert(obj2.obj === obj2);
    });
  });
});
