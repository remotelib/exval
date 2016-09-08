const assert = require('assert');
const Generator = require('../generator');
const { describe, it, before } = global;

let result = null;
function shouldHave(code, obj = eval(`(${code})`)) {
  it(`should have \`${code}\``, () => {
    assert.equal(result.get(obj), code);
  });
}

function shouldHaveClass(code) {
  shouldHave(code);
  shouldHave(`${code}.prototype`);
}

describe('generator', () => {
  describe('()', () => {
    before(() => {
      result = new Generator();
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

    // TODO handle mocha globals
    // shouldHave('require');
    // shouldHave('require.resolve');
    // shouldHave('fs');
    // shouldHave('fs.open');
  });
});
