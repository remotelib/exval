# exval

[![build](https://img.shields.io/travis/Anternet/exval.svg?branch=master)](https://travis-ci.org/Anternet/exval)
[![npm](https://img.shields.io/npm/v/exval.svg)](https://npmjs.org/package/anternet)
[![Join the chat at https://gitter.im/Anternet/exval](https://badges.gitter.im/Anternet/exval.svg)](https://gitter.im/Anternet/exval?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![npm](https://img.shields.io/npm/l/exval.svg)](LICENSE)


[exval](https://npmjs.org/package/exval) allows `uneval` JavaScript objects back to source code (including functions and classes!). This allows making shallow copy of an object and recreate it on other machine.

**WARNING: This library is under development.**
Many features may not work, throws exceptions or works partly.  If you find a bug, please open an issue or consider contributing to this project.


## Example

Consider the following `Counter` class:

```js
// File: "counter.js"

class Counter {
  constructor(init) {
    this.counter = init;
  }

  inc(a) {
    this.counter += a;
  }
}

// create a counter instance
const c1 = new Counter(100);

// update the counter and add some custom properties
c1.inc(2);
c1.foo = 'bar';

// export only the counter instance
module.exports = c1;
```

Now lets play with *exval*:
```js
// File: "index.js"

const Exval = require('exval'); // require exval
const c1 = require('./counter'); // get `c1` from file "counter.js"

// notice that `c1` exists but `Counter` is undefined in this file
assert.equal(typeof Counter, 'undefined');

// create a new exval instance
const exval = new Exval();

// generate the counter instance code and run it
const output = exval.stringify(c1);
const c2 = eval(`(${output})`);

// Counter class is still undefined but our counter cloned successfully
assert.equal(typeof Counter, 'undefined');
assert.equal(c2.counter, c1.counter);
assert.equal(c2.foo, c1.foo);

// we can even continue to use it as normal
c2.inc(1);
assert.equal(c2.counter, 103);

// the original counter stay the same
assert.equal(c1.counter, 102);
```


## Limitations

### Global Vars

*exvar* will not copy outer scope variables that has been used in your code (including globals and environment variables).
 It's **your responsibility** to make sure that all the globals variables are correctly copied and transferred between your machines.
 
```js
let glob = 1;
 
function counter() {
  return glob++;
}
 
const output = exval.stringify(counter);

console.log(output); // prints 'function counter() {\nreturn glob++;\n}'
                     // notice that the variable `glob` has been ommited
``` 


### Closures

*exvar* [can't access](http://stackoverflow.com/questions/4472529/accessing-variables-trapped-by-closure) variables in your inner closure. Therefore it's **your responsibility** to regenerate them before you can use the generated code.
 
```js
const inc = (() => {
  let counter = 0;
  
  return () => counter++;
})();

console.log(inc()) // "0"
console.log(inc()) // "1"
console.log(typeof counter) // "undefined"
 
const output = exval.stringify(inc);

console.log(output); // prints '() => counter++'
                     // notice the lack of the private variable `counter`
```


## License

[MIT License](LICENSE).
Copyright &copy; 2016 [Moshe Simantov](https://github.com/moshest)



