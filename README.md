# exval

[![build](https://img.shields.io/travis/Anternet/exval.svg?branch=master)](https://travis-ci.org/Anternet/exval)
[![npm](https://img.shields.io/npm/v/exval.svg)](https://npmjs.org/package/anternet)
[![Join the chat at https://gitter.im/Anternet/exval](https://badges.gitter.im/Anternet/exval.svg)](https://gitter.im/Anternet/exval?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![npm](https://img.shields.io/npm/l/exval.svg)](LICENSE)


[exval](https://npmjs.org/package/exval) Allows `uneval` JavaScript objects including functions and classes and run it on other machine.


## Example

```js
const Exval = require('exval');
const exval = new Exval();

// create a counter instance
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

// Counter class is undefined outside the closure
assert.equal(typeof Counter, 'undefined');

// update the counter and add some custom properties
c1.inc(2);
c1.foo = 'bar';

// generate the counter instance code and run it
const output = exval.stringify(c1);
const c2 = eval(`(${output})`);

// Counter class is still undefined  but our counter cloned successfully
assert.equal(typeof Counter, 'undefined');
assert.equal(c2.counter, c1.counter);
assert.equal(c2.foo, c1.foo);

// we can even continue to use it as normal
c2.inc(1);
assert.equal(c2.counter, 103);

// the original counter stay the same
assert.equal(c1.counter, 102);
```

## License

[MIT License](LICENSE).
Copyright &copy; 2016 [Moshe Simantov](https://github.com/moshest)



