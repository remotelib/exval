const acorn = require('acorn');

// we don't generate unicode vars so we can safely ignore it
// the only downside is that properties will appeared as `obj['ĦĔĽĻŎ']` instead of `obj.ĦĔĽĻŎ`
const VALID_MAP_PROP = /^[a-z0-9_$]+$/i;
const VALID_PROP = /^[a-z_$][a-z0-9_$]*$/i;
const VALID_VAR = /[a-z_$][\w_$]*/igm;
const VAR_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

const NATIVE_CODE = /\{\s+\[native code]\s+}$/;

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

const reservedWords = [
  'abstract', 'arguments', 'boolean', 'break', 'byte',
  'case', 'catch', 'char', 'class', 'const',
  'continue', 'debugger', 'default', 'delete', 'do',
  'double', 'else', 'enum*', 'eval', 'export',
  'extends', 'false', 'final', 'finally', 'float',
  'for', 'function', 'goto', 'if', 'implements',
  'import', 'in', 'instanceof', 'int', 'interface',
  'let', 'long', 'native', 'new', 'null',
  'package', 'private', 'protected', 'public', 'return',
  'short', 'static', 'super', 'switch', 'synchronized',
  'this', 'throw', 'throws', 'transient', 'true',
  'try', 'typeof', 'var', 'void', 'volatile',
  'while', 'with', 'yield',
  // Array 	Date 	eval 	function 	hasOwnProperty
  //Infinity 	isFinite 	isNaN 	isPrototypeOf 	length
  // Math 	NaN 	name 	Number 	Object
  // prototype 	String 	toString 	undefined 	valueOf
];

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

  static getClosureVar(index) {
    const chars = [];

    let i = index;
    do {
      const pos = (i) % VAR_CHARS.length;
      i = (i - pos) / VAR_CHARS.length;

      chars.push(VAR_CHARS[pos]);
    } while (i > 0);

    return chars.reverse().join('');
  }

  constructor(opts = {}) {
    this.saveFuncNames = opts.saveFuncNames || false;
    this.closureVars = new Set(reservedWords);
    this.closureVarIndex = 0;
  }

  encode(val, inner) {
    switch (typeof val) {
      case 'string': {
        return [this.constructor.encodeString(val)];
      }
      case 'object': {
        if (val === null) return ['null'];
        if (inner) return [val];

        if (val instanceof Array) {
          return this.encodeArray(val);
        }

        return this.encodeObject(val);
      }
      case 'undefined': {
        return ['undefined'];
      }
      case 'function': {
        if (inner) return [val];
        return this.encodeFunc(val);
      }
      case 'number':
      case 'boolean': {
        return [val.toString()];
      }
      case 'symbol': {
        // TODO add support for Symbols
        throw new TypeError('Symbols is currently not supported');
      }
      default: {
        throw new TypeError(`Unknown var type '${typeof val}'`);
      }
    }
  }

  genClosureVar() {
    let name;
    do {
      name = this.constructor.getClosureVar(this.closureVarIndex++);
    } while (this.closureVars.has(name));

    this.closureVars.add(name);
    return name;
  }

  encodeClosure(closure, content) {
    let clones = '';
    const cloneFn = this.genClosureVar();

    const values = Array.from(closure.values()).map(item => {
      if (!item[2]) return `${item[0]}=${item[1]}`;

      clones += `;${cloneFn}(${item[0]},${item[1]})`;
      return `${item[0]}={}`;
    }).join(',');

    if (clones) {
      // TODO handle symbols
      clones = `,${cloneFn}=function(t,s){` +
          'Object.setPrototypeOf(t,Object.getPrototypeOf(s));' +
          'Object.getOwnPropertyNames(s).map(function(n){' +
            'Object.defineProperty(t,n,Object.getOwnPropertyDescriptor(s,n))' +
          '})' +
      `};${clones}`;
    }

    return `function(){var ${values}${clones};return ${content}}()`;
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
      objData.prototype,
      ',',
      objData.customProps,
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
        output.push.apply(output, this.encode(item, true));
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

    if (node.type === 'ArrowFunctionExpression') {
      output = [code];
    } else if (funcType.has(node.type)) {
      const paramsStr = this.encodeFuncParams(funcData, node.params);
      output = [`function${node.generator ? '*' : ''}(${paramsStr})${funcData.body}`];
    } else {
      if (!classType.has(node.type)) {
        throw new SyntaxError(`Invalid function node '${node.type}'`);
      }

      if (objData.customProps.prototype) {
        delete objData.customProps.prototype;
        objData.customPropsLength--;
      }

      if (!node.superClass) {
        output = [`class${funcData.body}`];
      } else {
        output = ['class extends ', func.prototype, funcData.body];
      }
    }

    funcData.closureVars.forEach(name => this.closureVars.add(name));

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

      tokens.push(i > 0 ? `,${propStr}:` : `${propStr}:`);
      tokens.push.apply(tokens, this.encode(objData.obj[prop], true));
    });
    tokens.push('}');

    return tokens;
  }

  encodeObjectData(tokens, objData) {
    // TODO add support for Object.getOwnPropertySymbols
    let output = tokens;

    if (objData.customPropsLength) {
      output = ['Object.defineProperties('].concat(output, [',', objData.customProps, ')']);
    }

    if (objData.prototype) {
      output = ['Object.setPrototypeOf('].concat(output, [',', objData.prototype, ')']);
    }

    if (!objData.props.length) return output;

    const propsObj = this.encodeSimpleObject(objData);
    return ['Object.assign('].concat(output, [','], propsObj, [')']);
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

    if (NATIVE_CODE.test(code)) {
      throw new ReferenceError(`Couldn't encode native code "${code}"`);
    }

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
      throw new SyntaxError(`Invalid function string (Unexpected '${program.type}')`);
    }

    const exp = program.body[0];
    if (exp.type !== 'ExpressionStatement') {
      throw new SyntaxError(`Invalid expression (Unexpected '${exp.type}')`);
    }

    let node;
    if (getMethod) {
      const classExp = exp.expression;

      if (classExp.type !== 'ClassExpression') {
        throw new SyntaxError('Missing ClassExpression');
      }

      if (classExp.body.type !== 'ClassBody' || classExp.body.body.length !== 1) {
        throw new SyntaxError('Missing ClassBody');
      }

      const method = classExp.body.body[0];

      if (method.type !== 'MethodDefinition' || method.value.type !== 'FunctionExpression') {
        throw new SyntaxError('Missing MethodDefinition');
      }

      node = method.value;
    } else {
      node = exp.expression;
    }

    return {
      node,
      closureVars: this.getClosureVars(code),
      getCode: n => exCode.substring(n.start, n.end),
      body: exCode.substring(node.body.start, node.body.end),
    };
  }

  getClosureVars(code) {
    // TODO replace this with ClosureParser
    return new Set(code.match(VALID_VAR));
  }

  encodeFuncParams(funcData, params) {
    return params.map(param => {
      if (param.type === 'Identifier') return param.name;

      if (param.type !== 'AssignmentPattern') {
        throw new SyntaxError(`Unexpected param type ${param.type}`);
      }

      return funcData.getCode(param);
    }).join(',');
  }
}

module.exports = Encoder;
