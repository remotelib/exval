const acorn = require('acorn');

const VALID_MAP_PROP = /^[a-z0-9_$]+$/i;
const VALID_PROP = /^[a-z_$][a-z0-9_$]*$/i;

const funcType = new Set([
  'FunctionDeclaration', 'FunctionExpression',
  'GeneratorDeclaration', 'GeneratorExpression',
  'MethodDefinition',
  'GeneratorMethod',
]);

const classType = new Set([
  'ClassDeclaration', 'ClassExpression',
]);

const propertyDescriptorKeys = new Map([
  // ['v', 'value'],
  ['w', 'writable'],
  ['e', 'enumerable'],
  ['c', 'configurable'],
  ['g', 'get'],
  ['s', 'set'],
]);

const GeneratorFunction = Object.getPrototypeOf(function* f() { return false; }).constructor;


class Encoder {
  static encodeProp(str) {
    if (VALID_PROP.test(str)) return `.${str}`;

    // || str === 'true' || str === 'false' || str === 'null' || str === 'undefined'
    if (Number(str).toString() === str) return `[${str}]`;

    return `[${this.encodeString(str)}]`;
  }

  static encodeMapProp(str) {
    if (VALID_MAP_PROP.test(str)) return str;

    return this.encodeString(str);
  }

  static encodeString(str) {
    const escaped = str.replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');

    if (str.indexOf("'") === -1 || str.indexOf('"') !== -1) {
      return `'${escaped.replace(/'/g, '\\\'')}'`;
    }

    return `"${escaped}"`;
  }

  static matchPropDesc(target, match) {
    for (const [k, v] of propertyDescriptorKeys) {
      if (target[v] !== match[k]) return false;
    }

    return true;
  }

  constructor(opts = {}) {
    this.saveFuncNames = opts.saveFuncNames || false;
  }

  encode(val, inner) {
    switch (typeof val) {
      case 'string': {
        return this.constructor.encodeString(val);
      }
      case 'object': {
        if (val === null) return 'null';
        if (inner) return val;

        if (val instanceof Array) {
          return this.encodeArray(val);
        }

        return this.encodeObject(val);
      }
      case 'undefined': {
        return 'undefined';
      }
      case 'function': {
        if (inner) return val;
        return this.encodeFunc(val);
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

  encodePath(path) {
    return path.map((str, i) => {
      if (typeof str !== 'string' || i === 0) return str;

      return this.constructor.encodeProp(str);
    });
  }

  encodeObject(obj) {
    const objData = this.parseObject(obj);

    if (objData.isSimple) {
      return this.encodeSimpleObject(objData);
    }

    const tokens = [
      'Object.create(',
      this.encode(objData.prototype, true),
      ',',
      this.encode(objData.customProps, true),
      ')',
    ];

    objData.prototype = null;
    objData.customPropsLength = 0;
    objData.customProps = {};

    return this.encodeObjectData(tokens, objData);
  }

  encodeArray(obj) {
    const objData = this.parseObject(obj);
    let output;

    if (obj.length === 0 || this.isSimpleArray(obj)) {
      output = ['['];
      obj.forEach((item, i) => {
        if (i > 0) output.push(',');
        output.push(this.encode(item, true));
      });
      output.push(']');
    } else {
      output = [`new Array(${obj.length || ''})`];
    }

    if (objData.prototype === Array.prototype) {
      objData.prototype = null;
    }

    if (objData.customProps.length) {
      delete objData.customProps.length;
      objData.customPropsLength--;
    }

    objData.props = objData.props.filter(key => {
      const index = Number(key);
      return (index.toString() !== key || index < 0 || index >= obj.length);
    });

    return this.encodeObjectData(output, objData);
  }

  encodeFunc(func) {
    const code = Function.prototype.toString.call(func);
    const funcData = this.parseFunc(code);
    const node = funcData.node;
    const objData = this.parseObject(func);
    let output;

    if (node.type === 'ArrowFunction') {
      output = [code];
    } else if (funcType.has(node.type)) {
      const paramsStr = this.encodeFuncParams(funcData, node.params);
      output = [`function${node.generator ? '*' : ''}(${paramsStr})${funcData.body}`];
    } else {
      if (!classType.has(node.type)) {
        throw new Error(`Invalid function node '${node.type}'`);
      }

      if (objData.customProps.prototype) {
        delete objData.customProps.prototype;
        objData.customPropsLength--;
      }

      if (!node.superClass) {
        output = [`class${funcData.body}`];
      } else {
        const superClass = this.encode(func.prototype, true);
        output = ['class extends ', superClass, funcData.body];
      }
    }

    if (objData.prototype === Function.prototype
      || objData.prototype === GeneratorFunction.prototype) {
      objData.prototype = null;
    }

    if (objData.customProps.length) {
      delete objData.customProps.length;
      objData.customPropsLength--;
    }

    if (objData.customProps.arguments) {
      delete objData.customProps.arguments;
      objData.customPropsLength--;
    }

    if (objData.customProps.caller) {
      delete objData.customProps.caller;
      objData.customPropsLength--;
    }

    if (objData.customProps.name && !this.saveFuncNames || !func.name) {
      delete objData.customProps.name;
      objData.customPropsLength--;
    }

    if (objData.customProps.prototype) {
      const protoProps = Object.getOwnPropertyNames(func.prototype);
      if (protoProps.length === 0 || (protoProps.length === 1 && protoProps[0] === 'constructor'
        && func.prototype.constructor === func)) {
        delete objData.customProps.prototype;
        objData.customPropsLength--;
      }
    }

    return this.encodeObjectData(output, objData);
  }

  /** low level **/

  parseObject(obj) {
    let prototype = Object.getPrototypeOf(obj);
    if (prototype === Object.prototype) prototype = null;

    const props = Object.getOwnPropertyNames(obj);
    const customProps = {};
    const normalProps = props.filter(prop => {
      const desc = Object.getOwnPropertyDescriptor(obj, prop);

      if (this.constructor.matchPropDesc(desc, { w: true, e: true, c: true })) return true;

      customProps[prop] = desc;
      return false;
    });

    return {
      obj,
      prototype,
      constructor: prototype && prototype.constructor,
      props: normalProps,
      customProps,
      isSimple: (!prototype && props.length === normalProps.length),
      customPropsLength: (props.length - normalProps.length),
    };
  }

  encodeSimpleObject(objData) {
    const tokens = ['{'];
    objData.props.forEach((prop, i) => {
      const propStr = this.constructor.encodeMapProp(prop);

      const propName = i > 0 ? `,${propStr}:` : `${propStr}:`;
      const propValue = this.encode(objData.obj[prop], true);

      tokens.push(propName, propValue);
    });
    tokens.push('}');

    return tokens;
  }

  encodeObjectData(tokens, objData) {
    // TODO add support for Object.getOwnPropertySymbols
    let output = tokens;

    if (objData.customPropsLength) {
      // const propsStr = this.encode(objData.customProps, true);
      output = ['Object.defineProperties('].concat(output).push(',', objData.customProps, ')');
    }

    if (objData.prototype) {
      // const protoStr = this.encode(objData.prototype, true);
      output = ['Object.setPrototypeOf('].concat(output).push(',', objData.prototype, ')');
    }

    if (!objData.props.length) return output;

    const propsObj = this.encodeSimpleObject(objData);
    return ['Object.assign('].concat(output).push(',', propsObj, ')');
  }

  isSimpleArray(arr) {
    const maxUndefined = Math.min(arr.length, 10);

    let count = 0;
    for (let i = arr.length; --i >= 0;) {
      if (arr[i] === undefined) {
        count++;
        if (count >= maxUndefined) return false;
      }
    }

    return true;
  }

  parseFunc(code) {
    let program;
    let exCode;
    let getMethod = false;

    try {
      exCode = `(${code})`;
      program = acorn.parse(exCode);
    } catch (err) {
      try {
        exCode = `(class{${code}})`;
        program = acorn.parse(exCode);
        getMethod = true;
      } catch (err2) {
        throw err;
      }
    }

    if (program.type !== 'Program' || !program.body || !program.body.length) {
      throw new Error(`Invalid function string (Unexpected '${program.type}')`);
    }

    const exp = program.body[0];
    if (exp.type !== 'ExpressionStatement') {
      throw new Error(`Invalid expression (Unexpected '${exp.type}')`);
    }

    let node;
    if (getMethod) {
      const classExp = exp.expression;

      if (classExp.type !== 'ClassExpression') {
        throw new Error('Missing ClassExpression');
      }

      if (classExp.body.type !== 'ClassBody' || classExp.body.body.length !== 1) {
        throw new Error('Missing ClassBody');
      }

      const method = classExp.body.body[0];

      if (method.type !== 'MethodDefinition' || method.value.type !== 'FunctionExpression') {
        throw new Error('Missing MethodDefinition');
      }

      node = method.value;
    } else {
      node = exp.expression;
    }

    return {
      node,
      getCode: n => exCode.substring(n.start, n.end),
      body: exCode.substring(node.body.start, node.body.end),
    };
  }

  encodeFuncParams(funcData, params) {
    return params.map(param => {
      if (param.type === 'Identifier') return param.name;

      if (param.type !== 'AssignmentPattern') {
        throw new Error(`Unexpected param type ${param.type}`);
      }

      return funcData.getCode(param);
    }).join(',');
  }
}

module.exports = Encoder;
