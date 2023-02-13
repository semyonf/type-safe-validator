import assert from 'assert';
import { expectTypeOf } from 'expect-type';
import {
  getJoiSchema,
  getValid,
  LiteralParser,
  NumberParser,
  ObjectParser,
  TupleParser,
  ValidationFail
} from '.';
import {
  ArrayParser,
  BooleanParser,
  StringParser,
  UnionParser
} from './parsers';
import { deepEqual } from './test';

describe('index', () => {
  describe('simple', () => {
    interface Schema {
      readonly a: number;
      readonly b: number | null;
      readonly c: string;
    }

    const schema = ObjectParser({
      a: NumberParser(),
      b: NumberParser({ nullable: true }),
      c: StringParser()
    });

    it('can validate', () => {
      const [result, errors] = getValid(schema, {
        a: 1,
        b: null,
        c: 'foo'
      });

      if (result === ValidationFail) {
        assert.fail(`Validation failed: ${JSON.stringify(errors)}`);
      }

      // Check schema conformance
      expectTypeOf(result).toMatchTypeOf<Schema>();

      deepEqual(result, { a: 1, b: null, c: 'foo' });
      deepEqual(errors, []);
    });

    it('can detect errors', () => {
      const [result, errors] = getValid(schema, {
        a: 1,
        b: undefined,
        c: true
      });

      deepEqual(result, ValidationFail);
      deepEqual(errors, [
        {
          path: ['Property "b"'],
          message: 'Value is not optional'
        },
        {
          path: ['Property "c"'],
          message: 'Value "true" is not a string'
        }
      ]);
    });
  });

  describe('complex', () => {
    interface Schema {
      readonly num: number;
      readonly tuple: readonly [number, string | null, boolean | undefined];
      readonly object: { readonly a: number; readonly b: string };
      readonly array: readonly number[];
      readonly arrayWithNullElements: readonly (number | null)[];
      readonly objectArray: readonly {
        readonly a: number;
        readonly b: string;
      }[];
      readonly stringOrNumber: string | number;
    }

    const schema = ObjectParser({
      num: NumberParser(),

      tuple: TupleParser([
        NumberParser(),
        StringParser({ nullable: true }),
        BooleanParser({ optional: true })
      ] as const),

      object: ObjectParser({
        a: NumberParser(),
        b: StringParser(),
        c: LiteralParser(['abc', 123] as const)
      }),

      array: ArrayParser(NumberParser()),

      arrayWithNullElements: ArrayParser(NumberParser({ nullable: true })),

      objectArray: ArrayParser(
        ObjectParser({
          a: NumberParser(),
          b: StringParser()
        })
      ),

      stringOrNumber: UnionParser([StringParser(), NumberParser()])
    });

    it('can convert to Joi schema', () => {
      assert.deepStrictEqual(getJoiSchema(schema).describe(), {
        type: 'object',
        flags: { presence: 'required' },
        keys: {
          num: { type: 'number', flags: { presence: 'required' } },
          tuple: {
            type: 'object',
            flags: { presence: 'required' },
            keys: {
              '0': { type: 'number', flags: { presence: 'required' } },
              '1': {
                type: 'string',
                flags: { presence: 'required' },
                allow: [null]
              },
              '2': { type: 'boolean' }
            }
          },
          object: {
            type: 'object',
            flags: { presence: 'required' },
            keys: {
              a: { type: 'number', flags: { presence: 'required' } },
              b: { type: 'string', flags: { presence: 'required' } },
              c: {
                allow: ['abc', 123],
                flags: { only: true, presence: 'required' },
                type: 'any'
              }
            }
          },
          array: {
            type: 'array',
            flags: { presence: 'required' },
            items: [{ type: 'number', flags: { presence: 'required' } }]
          },
          arrayWithNullElements: {
            type: 'array',
            flags: { presence: 'required' },
            items: [
              { type: 'number', flags: { presence: 'required' }, allow: [null] }
            ]
          },
          objectArray: {
            type: 'array',
            flags: { presence: 'required' },
            items: [
              {
                type: 'object',
                flags: { presence: 'required' },
                keys: {
                  a: { type: 'number', flags: { presence: 'required' } },
                  b: { type: 'string', flags: { presence: 'required' } }
                }
              }
            ]
          },
          stringOrNumber: {
            type: 'alternatives',
            flags: { presence: 'required' },
            matches: [
              { schema: { type: 'string', flags: { presence: 'required' } } },
              { schema: { type: 'number', flags: { presence: 'required' } } }
            ]
          }
        }
      });
    });

    it('can validate', () => {
      const [result, errors] = getValid(schema, {
        num: 1,
        tuple: [1, 'thing', undefined],
        object: { a: 1, b: 'foo', c: 'abc' },
        array: [1, 2, 3],
        arrayWithNullElements: [1, null, 3],
        objectArray: [{ a: 1, b: 'foo' }],
        stringOrNumber: 123
      });

      if (result === ValidationFail) {
        assert.fail(`Validation failed: ${JSON.stringify(errors)}`);
      }

      // Check schema conformance
      expectTypeOf(result).toMatchTypeOf<Schema>();
      expectTypeOf(result).not.toMatchTypeOf<
        Schema & {
          readonly tuple: readonly [unknown, unknown];
        }
      >();
      expectTypeOf(result).not.toMatchTypeOf<
        Schema & {
          readonly objectArray: readonly {
            readonly a: number;
            readonly b: boolean;
          }[];
        }
      >();

      deepEqual(result, {
        num: 1,
        tuple: [1, 'thing', undefined],
        object: { a: 1, b: 'foo', c: 'abc' },
        array: [1, 2, 3],
        arrayWithNullElements: [1, null, 3],
        objectArray: [{ a: 1, b: 'foo' }],
        stringOrNumber: 123
      });
      deepEqual(errors, []);
    });

    it('can detect errors', () => {
      const [result, errors] = getValid(schema, {
        num: 1,
        tuple: [1, 'thing', false],
        object: { a: 1, b: 'foo' },
        array: [1, '2', 3],
        arrayWithNullElements: [1, undefined, 3],
        objectArray: [{ a: 1, b: 'foo' }],
        stringOrNumber: true
      });

      deepEqual(result, ValidationFail);
      deepEqual(errors, [
        {
          message: 'Value is not optional',
          path: ['Property "object"', 'Property "c"']
        },
        {
          message: 'Value "2" is not a number',
          path: ['Property "array"', 'Element 1']
        },
        {
          message: 'Value is not optional',
          path: ['Property "arrayWithNullElements"', 'Element 1']
        },
        {
          message: 'All union parsers failed validation',
          path: ['Property "stringOrNumber"']
        },
        {
          message: 'Value "true" is not a string',
          path: ['Property "stringOrNumber"', 'Parser 0']
        },
        {
          message: 'Value "true" is not a number',
          path: ['Property "stringOrNumber"', 'Parser 1']
        }
      ]);
    });
  });
});
