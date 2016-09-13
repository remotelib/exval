const CodeMap = require('./code-map');
const Encoder = require('./encoder');

// const FUNC_MAX_ARGUMENTS = 2048;

class Exval {

  constructor(opts = {}) {
    if (!(this instanceof Exval)) return new Exval(opts);

    this.codeMap = new CodeMap(opts);
    this.encoder = new Encoder(opts);
  }

  stringify(val) {
    const encoded = new Map();
    const closure = new Map();
    const left = [{
      count: 1,
      code: this.encoder.encode(val),
    }];
    let i = 0;

    do {
      const curr = left[i];
      let code = curr.code;
      if (!Array.isArray(code)) code = [code];

      for (const item of code) {
        if (typeof item === 'string') continue;

        let ref = encoded.get(item);
        if (!ref) {
          ref = { count: 0, code: null };

          const path = this.codeMap.get(item);
          if (path) {
            ref.code = this.encoder.encodePath(path);
          } else {
            ref.code = this.encoder.encode(item);
          }

          left.push(ref);
          if (i > 100) {
            left.splice(0, i);
            i = 0;
          }
        } else if (ref.count === 0) {
          // TODO check for collision with global values on functions
          closure.set(item, this.encoder.closureName(closure.length));
        }

        ref.count++;
        encoded.set(item, ref);
      }
    } while (++i < left.length);

    return this.build(closure, encoded, val);
  }

  encode(val) {
    switch (typeof val) {
      case 'string': {
        return encoder.encodeString(val);
      }
      case 'object': {
        if (val === null) return 'null';

        const objPath = this.codeMap.get(val);
        if (objPath) return encoder.encodePath(objPath);

        if (val instanceof Array) {
          return encoder.encodeArray(val, innerVal => this.encode(innerVal));
        }

        return encoder.encodeObject(val, innerVal => this.encode(innerVal));
      }
      case 'undefined': {
        return 'undefined';
      }
      case 'function': {
        const objPath = this.codeMap.get(val);
        if (objPath) return objPath;

        return encoder.encodeFunc(val, this.saveFuncNames, innerVal => this.encode(innerVal));
      }
      case 'number':
      case 'boolean': {
        return val.toString();
      }
      case 'symbol': {
        // TODO add support for Symbols
        throw new Error('Symbols is currently not supported');
      }
      default: {
        throw new Error(`Unknown var type '${typeof val}'`);
      }
    }
  }
}

module.exports = Exval;
