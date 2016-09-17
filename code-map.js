const stream = require('stream');
const crypto = require('crypto');

const Generator = Object.getPrototypeOf(function* f() { return false; }()).constructor;
// const GeneratorFunction = Object.getPrototypeOf(function* f() { return false; }).constructor;

const nodeIgnore = [
  require.cache,
  require.extensions,
  require.main,
];

const deprecated = new WeakMap([
  [global, new Set([
    'GLOBAL',
    'root',
  ])],
  [process, new Set([
    'EventEmitter',
  ])],
  [crypto, new Set([
    'createCredentials',
    'Credentials',
  ])],
  [stream.Stream.Writable.WritableState.prototype, new Set([
    'buffer',
  ])],
]);

// TODO make this more simple with only one level: obj->prop

class CodeMap extends WeakMap {
  static getPropValue(obj, propName) {
    try {
      return obj[propName];
    } catch (err) {
      return null;
    }
  }

  static pathCompare(a, b) {
    if (a.length !== b.length) {
      return a.length - b.length;
    }

    const aStr = a.filter(str => typeof str === 'string').join();
    const bStr = b.filter(str => typeof str === 'string').join();

    return aStr.length - bStr.length;
  }

  constructor(opts = {}) {
    const scan = opts.scan || global;
    super([
      [scan, opts.path || ['global']],
    ]);

    if (opts.sharedObjects) {
      opts.sharedObjects.forEach((obj, path) => this.add(obj, path));
    }

    this.scanned = new WeakSet(opts.ignore || []);

    if (opts.node !== false) {
      for (const obj of nodeIgnore) {
        if (obj) this.scanned.add(obj);
      }
    }

    this.scan(scan, opts.path || []);

    if (scan === global) {
      this.scan(Generator.prototype, ['(function*(){})()']);
      // this.scan(GeneratorFunction, 'Object.getPrototypeOf(function*(){}).constructor');
    }
  }

  add(obj, path) {
    this.set(obj, path);
    this.scanned.add(obj);
  }

  scan(obj, path) {
    if (obj === null) return;

    const type = typeof obj;
    if (type !== 'object' && type !== 'function') return;

    if (!this.scanned.has(obj)) {
      this.scanned.add(obj);
    } else if (path.length) {
      const currPath = this.get(obj);
      if (!currPath || this.constructor.pathCompare(currPath, path) <= 0) return;
    }

    if (path.length) this.add(obj, path);

    const deprecates = deprecated.get(obj);
    Object.getOwnPropertyNames(obj).forEach(propName => {
      if (deprecates && deprecates.has(propName)) return;

      const prop = this.constructor.getPropValue(obj, propName);
      this.scan(prop, path.concat(propName));
    });
  }
}

module.exports = CodeMap;

