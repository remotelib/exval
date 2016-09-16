const CodeMap = require('./code-map');
const Encoder = require('./encoder');

// const FUNC_MAX_ARGUMENTS = 2048;

class Exval {

  constructor(opts = {}) {
    if (!(this instanceof Exval)) return new Exval(opts);

    this.opts = Object.assign({}, opts);
    this.codeMap = new CodeMap(opts);
  }

  stringify(val) {
    const encoder = new Encoder(this.opts);
    const valPath = this.codeMap.get(val);

    const left = [{
      count: 1,
      code: valPath ? encoder.encodePath(valPath) : encoder.encode(val),
    }];
    const encoded = new Map([
      [val, left[0]],
    ]);

    const closureVars = new Set();
    let i = 0;
    do {
      const curr = left[i];

      for (const item of curr.code) {
        if (typeof item === 'string') continue;

        let ref = encoded.get(item);
        if (!ref) {
          ref = { count: 0, code: null };

          const path = this.codeMap.get(item);
          if (path) {
            ref.code = encoder.encodePath(path);
          } else {
            ref.code = encoder.encode(item);
          }

          left.push(ref);
          if (i > 100) {
            left.splice(0, i);
            i = 0;
          }
        } else if (ref.count === 1) {
          closureVars.add(item);
        }

        ref.count++;
        encoded.set(item, ref);
      }
    } while (++i < left.length);

    const buildCode = this.build(encoded, encoded.get(val));
    if (!closureVars.size) return buildCode.join('');

    const closureMap = new Map();

    for (const obj of closureVars) {
      closureMap.set(obj, {
        name: encoder.genClosureVar(),
        buildCode: this.build(encoded, encoded.get(obj)),
      });
    }

    if (!closureMap.has(val)) {
      closureMap.set(val, {
        buildCode,
      });
    }

    const closure = new Map();
    this.buildClosureMap(closure, closureMap, val);

    const valData = closure.get(val);
    let content;
    if (!valData[2]) {
      content = valData[1];
      closure.delete(val);
    } else {
      content = valData[0];
    }

    return encoder.encodeClosure(closure, content);
  }

  build(encoded, ref) {
    const buildCode = [];
    ref.code.forEach(item => {
      if (typeof item === 'string') {
        buildCode.push(item);
        return;
      }

      const itemRef = encoded.get(item);
      if (!itemRef) throw new ReferenceError(`Object ${item} not found on the encoded map`);

      if (itemRef.count > 1) {
        buildCode.push(item);
        return;
      }

      buildCode.push.apply(buildCode, this.build(encoded, itemRef));
    });
    return buildCode;
  }

  buildClosureMap(closure, closureMap, val) {
    const data = closureMap.get(val);
    if (!data) throw new ReferenceError(`Object ${val} not found on the closure map`);

    if (data.circular !== undefined) {
      if (!closure.has(val)) {
        closure.set(val, null); // order placeholder
      }

      data.circular = true;
      return data.name;
    }

    data.circular = false;

    let buildCode = '';
    for (const item of data.buildCode) {
      if (typeof item === 'string') {
        buildCode += item;
      } else {
        buildCode += this.buildClosureMap(closure, closureMap, item);
      }
    }

    closure.set(val, [data.name, buildCode, data.circular]);
    return data.name;
  }
}

module.exports = Exval;
