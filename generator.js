const stream = require('stream');
const crypto = require('crypto');
const encoder = require('./encoder');

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

class Generator extends WeakMap {
  static getPropCode(code, propName) {
    return code ? `${code}${encoder.encodeProp(propName)}` : propName;
  }

  static getPropValue(obj, propName) {
    try {
      return obj[propName];
    } catch (err) {
      return null;
    }
  }

  constructor(opts = {}) {
    const scan = opts.scan || global;
    super([
      [scan, opts.path || 'global'],
    ]);

    this.sharedObjects = new WeakSet(opts.sharedObjects || []);
    this.scanned = new WeakSet(opts.ignore || []);

    if (opts.node !== false) {
      for (const obj of nodeIgnore) {
        if (obj) this.scanned.add(obj);
      }
    }

    this.scan(scan, opts.path);
  }

  add(obj, code) {
    this.set(obj, code);
    this.scanned.add(obj);
  }

  scan(obj, code) {
    if (obj === null) return;

    const type = typeof obj;
    if (type !== 'object' && type !== 'function') return;

    if (!this.scanned.has(obj)) {
      this.scanned.add(obj);
    } else if (code) {
      const currCode = this.get(obj);
      if (!currCode || currCode.length <= code.length) return;
    }

    if (code) this.add(obj, code);

    const deprecates = deprecated.get(obj);
    Object.getOwnPropertyNames(obj).forEach(propName => {
      if (deprecates && deprecates.has(propName)) return;

      const prop = this.constructor.getPropValue(obj, propName);
      const propCode = this.constructor.getPropCode(code, propName);

      this.scan(prop, propCode);
    });
  }
}

module.exports = Generator;

