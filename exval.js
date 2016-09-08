const Generator = require('./generator');
const encoder = require('./encoder');

// const FUNC_MAX_ARGUMENTS = 2048;

class Exval {

  constructor(opts = {}) {
    if (!(this instanceof Exval)) return new Exval(opts);

    this.codeMap = new Generator(opts);
  }

  stringify(val) {
    // TODO handle object refs

    return this.encode(val);
  }

  encode(val) {
    switch (typeof val) {
      case 'string': {
        return encoder.encodeString(val);
      }
      case 'object': {
        if (val === null) return 'null';

        const objCode = this.codeMap.get(val);
        if (objCode) return objCode;

        const obj = encoder.parseObject(val);

        if (obj.isSimple) {
          const propsStr = obj.props.map(prop => {
            const propName = encoder.encodeMapProp(prop);
            const propValue = this.encode(val[prop]);
            return `${propName}:${propValue}`;
          });

          return `{${propsStr.join(',')}}`;
        }

        let output;
        // if (obj instanceof Array) {
        //   if (encoder.isSimpleArray(val)) {
        //     output = `[]`
        //   }
        //   // if (obj.hasCustomProps)
        //   // output = `(() => {const a = new Array`
        // } else {
        const protoStr = this.encode(obj.prototype);
        const propsStr = this.encode(obj.customProps);

        output = `Object.create(${protoStr},${propsStr})`;
        // }

        if (obj.props.length) {
          obj.props.forEach(prop => {
            output += `;o${encoder.encodeProp(prop)}=${this.encode(val[prop])}`;
          });
          output = `(()=>{const o=${output};return o})()`;
        }

        return output;
      }
      case 'undefined': {
        return 'undefined';
      }
      case 'function': {
        const objCode = this.codeMap.get(val);
        if (objCode) return objCode;

        return encoder.encodeFunc(val);
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
