const assert = require('assert');
const Exval = require('../');
const { describe, it } = global;

describe('Demo', () => {
  const exval = new Exval();

  describe('README', () => {
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
});
