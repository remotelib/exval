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
    const codeMap = new WeakMap(this.codeMap);
    const codeArr = this.encode(codeMap, val);

    return this.build(codeMap, path);
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
