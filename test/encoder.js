const assert = require('assert');
const Encoder = require('../encoder');
const { describe, it, before } = global;


let encoder;
function shouldEncode(tokens, obj = eval(`(${tokens})`), code = tokens) {
  it(`should encode ${code}`, () => {
    assert.deepEqual(encoder.encode(obj), Array.isArray(tokens) ? tokens : [tokens]);
  });
}

describe('Encoder', () => {
  describe('static', () => {
    describe('.getClosureVar', () => {
      it('should work at 0', () => {
        assert.equal(Encoder.getClosureVar(0), 'a');
      });

      it('should work at 1', () => {
        assert.equal(Encoder.getClosureVar(1), 'b');
      });

      it('should work at 25', () => {
        assert.equal(Encoder.getClosureVar(25), 'z');
      });

      it('should work at 26', () => {
        assert.equal(Encoder.getClosureVar(26), 'A');
      });

      it('should work at 51', () => {
        assert.equal(Encoder.getClosureVar(51), 'Z');
      });

      it('should work at 52', () => {
        assert.equal(Encoder.getClosureVar(52), 'ba');
      });
    });
  });

  describe('instance', () => {
    before(() => {
      encoder = new Encoder();
    });

    describe('.encodePath', () => {
      it('should encode `foo`', () => {
        assert.deepEqual(encoder.encodePath(['foo']), ['foo']);
      });

      it('should encode `foo.bar`', () => {
        assert.deepEqual(encoder.encodePath(['foo', 'bar']), ['foo', '.bar']);
      });

      it('should encode `foo["bar "]`', () => {
        assert.deepEqual(encoder.encodePath(['foo', 'bar ']), ['foo', '[\'bar \']']);
      });

      it('should encode `foo[5]`', () => {
        assert.deepEqual(encoder.encodePath(['foo', '5']), ['foo', '[5]']);
      });

      it('should encode `foo[-4.3535]`', () => {
        assert.deepEqual(encoder.encodePath(['foo', '-4.3535']), ['foo', '[-4.3535]']);
      });

      it('should encode `foo["0349"]`', () => {
        assert.deepEqual(encoder.encodePath(['foo', '0349']), ['foo', '[\'0349\']']);
      });

      it('should encode `foo.NaN`', () => {
        assert.deepEqual(encoder.encodePath(['foo', 'NaN']), ['foo', '.NaN']);
      });

      it('should encode `foo.nan`', () => {
        assert.deepEqual(encoder.encodePath(['foo', 'nan']), ['foo', '.nan']);
      });

      it('should encode `foo.null`', () => {
        assert.deepEqual(encoder.encodePath(['foo', 'null']), ['foo', '.null']);
      });

      it('should encode `foo.true`', () => {
        assert.deepEqual(encoder.encodePath(['foo', 'true']), ['foo', '.true']);
      });

      it('should encode `foo.false`', () => {
        assert.deepEqual(encoder.encodePath(['foo', 'false']), ['foo', '.false']);
      });

      it('should encode `foo.undefined`', () => {
        assert.deepEqual(encoder.encodePath(['foo', 'undefined']), ['foo', '.undefined']);
      });

      it('should encode `foo[obj]`', () => {
        const obj = {};
        assert.deepEqual(encoder.encodePath(['foo', obj]), ['foo', obj]);
      });

      it('should encode `foo[obj].bar`', () => {
        const obj = {};
        assert.deepEqual(encoder.encodePath(['foo', obj, 'bar']), ['foo', obj, '.bar']);
      });

      it('should encode `foo["bar "][obj]`', () => {
        const obj = {};
        assert.deepEqual(encoder.encodePath(['foo', 'bar ', obj]), ['foo', '[\'bar \']', obj]);
      });
    });

    describe('.encode String', () => {
      describe('String', () => {
        shouldEncode('\'foo\'');
        shouldEncode('\'foo bar\'');
        shouldEncode('\'foo\\rbar\'');
        shouldEncode('\'foo\\nbar\'');
        shouldEncode('\'foo\\tbar\'');
        shouldEncode('\'foo"bar\'');
        shouldEncode('\'foo"b"ar\'');
        shouldEncode('"foo\'bar"');
        shouldEncode('"foo\'b\'ar"');
        shouldEncode('\'foo\\\'b"ar\'');
        shouldEncode('\'foo\\\\\'');
        shouldEncode('\'"foo\\\\\\\'\'');
      });

      describe('Number', () => {
        shouldEncode('123');
        shouldEncode('14.63563');
        shouldEncode('-74');
        shouldEncode('NaN');
        shouldEncode('Infinity');
      });

      describe('Boolean', () => {
        shouldEncode('true');
        shouldEncode('false');
      });

      describe('Undefined', () => {
        shouldEncode('undefined');
      });

      describe('Object', () => {
        shouldEncode('null');
        shouldEncode(['{', '}'], {}, '{}');

        const obj = {};
        shouldEncode(['{', 'foo:', obj, '}'], { foo: obj }, '{foo:obj}');

        shouldEncode(['{', 'foo:', obj, ',bar:', obj, '}'],
          { foo: obj, bar: obj },
          '{foo:obj,bar:obj}'
        );
      });

      // TODO test for functions
      // TODO test for classes
      // TODO test for props
    });
  });
});
