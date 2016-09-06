const acorn = require('acorn');

const VALID_PROP = /^[a-z0-9_$]+$/i;
const METHOD_MATCH
  = /^(static\s+|get\s+|set\s+)?((\*\s*)?[a-zA-Z0-9_$]+\s*\([^)]*\)\s*\{(.|\n)*})$/;
// const FUNC_MAX_ARGUMENTS = 2048;

class Exval {
  static encodeString(str) {
    return `'${str.replace(/'/g, '\\\'')}'`;
  }

  static encodeProp(str) {
    if (VALID_PROP.test(str)) return str;

    return this.encodeString(str);
  }

  static encodeFunc(func) {
    const str = Object.toString.call(func);
    const matchMethod = METHOD_MATCH.exec(str);

    if (matchMethod) {
      // TODO handle supers
      return `function ${matchMethod[2]}`;
    }

    const program = acorn.parse(str, {
      sourceType: 'module', // influences global strict mode and import and export declarations
    });

    if (program.type !== 'Program' || !program.body || !program.body.length) {
      throw new Error(`Invalid function string '${program.type}'`);
    }

    const node = program.body[0];

    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression'
      || node.type === 'GeneratorDeclaration' || node.type === 'GeneratorExpression'
      || node.type === 'ArrowFunction') return str;

    // if (node.type === 'MethodDefinition' || node.type === 'GeneratorMethod') {
    //   console.log(node);
    //   // return '1';
    // }

    if (node.type !== 'ClassDeclaration' && node.type !== 'ClassExpression') {
      throw new Error(`Invalid function node '${node.type}'`);
    }

    if (!node.body || node.body.type !== 'ClassBody') {
      throw new Error('Missing ClassBody');
    }

    const methods = Array.isArray(node.body.body) ? node.body.body : [node.body.body];

    for (let i = 0; i < methods.length; i++) {
      if (methods[i].type !== 'MethodDefinition' || methods[i].kind !== 'constructor') continue;

      const funcExp = methods[i].value;
      if (funcExp.type !== 'FunctionExpression') {
        throw new Error(`Invalid function node '${funcExp.type}'`);
      }

      const method = str.substring(funcExp.start, funcExp.end);
      // TODO handle supers
      return `function ${method}`;
    }

    // TODO call super
    return 'function() {}';
  }

  constructor(opts = {}) {
    if (!(this instanceof Exval)) return new Exval(opts);

    this.sharedObjects = [Array].concat(opts.sharedObjects);
  }

  stringify(val) {
    return this.encode(val);
  //   const objects = new WeakMap();
  //   const valArr = this.process(val, objects);
  //
  //   const vars = new Map();
  //   const exval = this.build(vars, objects, val);
  //
  //   if (!vars.length) return exval;
  //
  //   if (vars.length < FUNC_MAX_ARGUMENTS) {
  //     const argumentsNames = Array.from(vars.keys()).join(',');
  //     const argumentsValues = Array.from(vars.values()).join(',');
  //     return `((${argumentsNames})=>{return ${exval}})(${argumentsValues})`;
  //   }
  //
  //   const varList = [];
  //   vars.forEach((strVal, name) => {
  //     varList.push(`${name}=${strVal}`)
  //   });
  //
  //   return `(()=>{const ${varList.join(',')};return ${exval}})()`;
  }

  // process(objects, val) {
  //   if (typeof val !== 'object' || val === null) return;
  //
  //   const refs = objects.get(val);
  //   if(refs !== undefined) {
  //     objects.set(val, refs + 1);
  //     return;
  //   }
  //
  //   objects.set(val, 0);
  //
  //   for(var i in val) {
  //     if (!val.hasOwnProperty(i)) continue;
  //
  //     this.process(objects, val[i]);
  //   }
  // }

  // build(vars, objects, val) {
  //
  // }

  encode(val) {
    switch (typeof val) {
      case 'string': {
        return this.constructor.encodeString(val);
      }
      case 'object': {
        if (val === null) return 'null';

        const prototype = Object.getPrototypeOf(val);
        const constructor = prototype && prototype.constructor;
        let simpleObject = (constructor === Object);

        const props = Object.getOwnPropertyNames(val);
        const propertiesObject = {};

        props.forEach(prop => {
          const desc = Object.getOwnPropertyDescriptor(val, prop);

          if (simpleObject) {
            if (desc.writable !== true || desc.enumerable !== true || desc.configurable !== true
              || desc.get !== undefined || desc.set !== undefined) simpleObject = false;
          }

          propertiesObject[prop] = desc;
        });

        if (simpleObject) {
          const propsStr = props.map(prop => {
            const propName = this.constructor.encodeProp(prop);
            const propValue = this.encode(val[prop]);
            return `${propName}:${propValue}`;
          });

          return `{${propsStr.join(',')}}`;
        }

        const protoStr = prototype !== Object.prototype ? this.encode(prototype) : null;
        const propsStr = this.encode(propertiesObject);

        return `Object.create(${protoStr},${propsStr})`;
      }
      case 'undefined': {
        return 'undefined';
      }
      case 'function': {
        return this.constructor.encodeFunc(val);
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
