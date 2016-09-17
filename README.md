# exval

[![build](https://img.shields.io/travis/Anternet/exval.svg?branch=master)](https://travis-ci.org/Anternet/exval)
[![npm](https://img.shields.io/npm/v/exval.svg)](https://npmjs.org/package/anternet)
[![Join the chat at https://gitter.im/Anternet/exval](https://badges.gitter.im/Anternet/exval.svg)](https://gitter.im/Anternet/exval?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![npm](https://img.shields.io/npm/l/exval.svg)](LICENSE)


[exval](https://npmjs.org/package/exval) allows `uneval` JavaScript 
objects back to source code (including functions and classes!).
This allows making shallow copy of an object and recreate it on other
machine.

**WARNING: This library is under development.**
Many features may not work, throws exceptions or works partly.
If you find a bug, please open an issue or consider contributing to 
this project.


## Examples

### Object Cloning

```js
const Exval = require('exval'); // require exval
const exval = new Exval(); // create a new exval instance

const obj = {
  foo: 'bar',
  deep: {
    hello: 'world',
  },
  pow: Math.pow,
};

const output = exval.stringify(obj);
console.log(output); // {foo:'bar',deep:{hello:'world'},pow:Math.pow}

const obj2 = eval(`(${output})`);
assert(obj2 !== obj);
assert(obj2.deep !== obj.deep);
assert.deepEqual(obj2, obj);
```

### Class Instance

```js
const Exval = require('exval'); // require exval
const exval = new Exval(); // create a new exval instance

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
}());

// notice that we didn't define `Counter` class here
assert.equal(typeof Counter, 'undefined');
  
// update the counter and add some custom properties
c1.inc(2);
c1.foo = 'bar';

// generate the counter instance code and run it
const output = exval.stringify(c1);
const c2 = eval(`(${output})`);

// Counter class is still undefined but our counter cloned successfully
assert.equal(typeof Counter, 'undefined');
assert.equal(c2.counter, c1.counter);
assert.equal(c2.foo, c1.foo);

// we can even continue to use it as normal!
c2.inc(1);
assert.equal(c2.counter, 103);

// the original counter stay the same
assert.equal(c1.counter, 102);
```
      
### Multiple References

```js
const Exval = require('exval'); // require exval
const exval = new Exval(); // create a new exval instance

const a = { name: 'a' };

const obj = {
  a1: a,
  a2: a,
};

const output = exval.stringify(obj);
console.log(output); // function(){var a={name:'a'};return {a1:a,a2:a}}()

const obj2 = eval(`(${output})`);
assert.deepEqual(obj2, obj);
assert(obj2.a1 === obj2.a2);
``` 
     
### Close Loop References

```js
const Exval = require('exval'); // require exval
const exval = new Exval(); // create a new exval instance

const obj = { foo: 'bar' };
obj.obj = obj;

const output = exval.stringify(obj);
const obj2 = eval(`(${output})`);
                  
assert(obj2 !== obj); 
assert(obj2.foo === obj.foo);
assert(obj2.obj === obj2);
```

## Limitations

### Global Vars

*exvar* will not copy outer scope variables that has been used in your 
code (including globals and environment variables). It's **your 
responsibility** to make sure that all the globals variables are 
correctly copied and transferred between your machines.
 
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

*exvar* [can't](http://stackoverflow.com/q/4472529/518153)
[access](http://stackoverflow.com/a/39429547/518153)
variables in your inner closure. Therefore it's **your responsibility**
to regenerate them before you can use the generated code.
 
```js
const inc = (() => {
  let counter = 0;
  
  return () => counter++;
})();

console.log(inc()) // "0"
console.log(inc()) // "1"
console.log(typeof counter) // "undefined"
 
const output = exval.stringify(inc);
const inc2 = eval(`{$output}`);

inc2(); // Throws "ReferenceError: counter is not defined"
```


### The `supper` Keyword

It's impossible to know a method parent class outside the class context.
Therefore, calling methods that using the `super` keyword will fail to
run, although `exval`ing the hole class **will works**! 
 
```js
class Foo {
  getName() {
    return 'Foo';
  }
}
 
class FooBar extends Foo {
  getName() {
    return `${super.getName()}Bar`;
  }
}

// create shallow copy of the hole class will work
exval.stringify(FooBar);

// create shallow copy of the method `getName`
// throws "SyntaxError: 'super' keyword unexpected here"
exval.stringify(FooBar.prototype.getName);
```

## License

[MIT License](LICENSE).
Copyright &copy; 2016 [Moshe Simantov](https://github.com/moshest)



