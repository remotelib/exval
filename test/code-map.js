const assert = require('assert');
const CodeMap = require('../code-map');
const { describe, it, before } = global;

let result = null;
function shouldHave(code, obj = eval(`(${code})`), path = code.split('.')) {
  it(`should have \`${code}\``, () => {
    assert.deepEqual(result.get(obj), path);
  });
}

function shouldHaveClass(code) {
  shouldHave(code);
  shouldHave(`${code}.prototype`);
}

describe('CodeMap', () => {
  describe('()', () => {
    before(() => {
      result = new CodeMap();
    });

    it('should be an instance of `WeakMap`', () => {
      assert(result instanceof WeakMap);
    });

    shouldHaveClass('Object');
    shouldHaveClass('Number');
    shouldHaveClass('Function');
    shouldHaveClass('Boolean');
    shouldHaveClass('Map');
    shouldHaveClass('WeakMap');
    shouldHaveClass('Error');
    shouldHaveClass('TypeError');

    shouldHave('Object.prototype.toString');
    shouldHave('Function.prototype.toString');

    shouldHave('Buffer');
    shouldHave('Buffer.from');

    shouldHave('Math');
    shouldHave('Math.pow');

    // TODO handle node libs
    // shouldHave('require');
    // shouldHave('require.resolve');
    // shouldHave('fs');
    // shouldHave('fs.open');
  });
});
