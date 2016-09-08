const acorn = require('acorn');

const VALID_MAP_PROP = /^[a-z0-9_$]+$/i;
const VALID_PROP = /^[a-z_$][a-z0-9_$]*$/i;

const METHOD_MATCH
  = /^(static\s+|get\s+|set\s+)?((\*\s*)?[a-zA-Z0-9_$]+\s*\([^)]*\)\s*\{(.|\n)*})$/;


exports.encodeString = (str) => `'${str.replace(/'/g, '\\\'')}'`;

exports.encodeMapProp = (str) => {
  if (VALID_MAP_PROP.test(str)) return str;

  return this.encodeString(str);
};

exports.encodeProp = (str) => {
  if (VALID_PROP.test(str)) return `.${str}`;

  if (Number(str).toString() === str || str === 'true' || str === 'false'
    || str === 'null' || str === 'undefined') return `[${str}]`;

  return `[${this.encodeString(str)}]`;
};

exports.parseObject = (obj) => {
  let prototype = Object.getPrototypeOf(obj);
  if (prototype === Object.prototype) prototype = null;

  const props = Object.getOwnPropertyNames(obj);
  const customProps = {};
  const normalProps = props.filter(prop => {
    const desc = Object.getOwnPropertyDescriptor(obj, prop);

    if (desc.writable === true && desc.enumerable === true && desc.configurable === true
      && desc.get === undefined && desc.set === undefined) return true;

    customProps[prop] = desc;
    return false;
  });

  return {
    prototype,
    constructor: prototype && prototype.constructor,
    props: normalProps,
    customProps,
    isSimple: (!prototype && props.length === normalProps.length),
    hasCustomProps: (props.length > normalProps.length),
  };
};

exports.encodeFunc = (func) => {
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
  for (const method of methods) {
    if (method.type !== 'MethodDefinition' || method.kind !== 'constructor') continue;

    return `class{${str.substring(method.start, method.end)}}`;
  }

  // TODO call super
  return 'class{}';
};

exports.isSimpleArray = (arr) => {
  let count = 0;
  for (let i = arr.length; --i >= 0;) {
    if (arr[i] === undefined) {
      count++;
      if (count > 10) return false;
    }
  }

  return true;
};
