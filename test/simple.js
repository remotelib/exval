const assert = require('assert');
const Exval = require('../');
const { describe, it } = global;

describe('simple', () => {
  const exval = new Exval();

  function itEval(code, obj = eval(`(${code})`)) {
    it(`should output \`${code}\``, () => {
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
    itEval('"Foo \'Bar"');
    itEval('"Foo \'\'Bar"');
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

  describe('Array', () => {
    itEval('[]');
    itEval('[\'foo\']');
    itEval('[1,2,3]');
    itEval('new Array(100)');
  });

  describe('Function', () => {
    itEval('function(){}');
    itEval('function(a){return a+a}');
    itEval('function(a,b={foo:1}){return a+b.foo}');
  });

  describe('Function*', () => {
    itEval('function*(){yield 123;}');
    itEval('function*(a){return a+a}');
    itEval('function*(a,b={foo:1}){return a+b.foo}');
  });

  describe('Class', () => {
    itEval('class{test(){}}');
    itEval('class{constructor(name){this.name=name}}');
  });

  describe('Method', () => {
    itEval('function(){}', (class { m() {} }).prototype.m);
    itEval('function(){ this.foo = 1; }', (class { m() { this.foo = 1; } }).prototype.m);
    itEval('function(a){ return a; }', (class { m(a) { return a; } }).prototype.m);

    itEval('function(a,b = 1){ return a + b; }', (class {
      m(a, b = 1) { return a + b; }
    }).prototype.m);

    itEval('function*(){ this.foo = 1; }', (class { *test() { this.foo = 1; } }).prototype.test);
  });

  describe('Method*', () => {
    itEval('function*(){ yield 1; }', (class { *m() { yield 1; } }).prototype.m);
    itEval('function*(){ this.foo = 1; }', (class { *m() { this.foo = 1; } }).prototype.m);
    itEval('function*(a){ return a; }', (class { *m(a) { return a; } }).prototype.m);

    itEval('function*(a,b = 1){ return a + b; }', (class {
      *m(a, b = 1) { return a + b; }
    }).prototype.m);
  });

  // TODO test symbols
});
