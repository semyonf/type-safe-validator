> Originally forked from https://github.com/cjdell/type-safe-validator

# type-safe-validator

A validation library designed to take full advantage of the TypeScript type system. All return types are inferred directly from the schema.

## Motivation

I wanted a library that would guarantee that my validation schema will always fully comply with my TypeScript interfaces. As far I as know, such a library did not exist.

This library aims to completely stop runtime errors by ensuring that a compiled TypeScript program can never mistakenly receive an invalid object from sources such a REST API.

## Benefits

- Less bugs. No disparity between the schema and the interface your code compiles.
- If an object successfully makes its way into your domain, it is guaranteed to be in the correct shape.
- Explicit checks for `null` and `undefined`.
- Infinitely nestable schemas for Objects, Tuples, Arrays, Records and Union types.
- Supports literal types.
- Direct support custom parsers and "Opaque" types (see `ts-essentials` module).
- All excess properties are trimmed and a deep copy is returned. The original object is untouched.

## Usage modes

Two primary usages depending on preference:

Use `assertValid` to get a validated object, or throw if there is an error:

    const answer = assertValid(schema, input);

Use `getValid` to get a tuple which contains a valid object result, or detailed failure information:

    const [answer, errors] = getValid(schema, input);

    if (answer !== ValidationFail) {
      // Use answer
    }

The `errors` array will contain a list of all error messages, each with a `path` property, and a human readable `message` string.

## Example

Object schema with different property types, some of which are optional / allow nulls:

    interface Schema {
      readonly a: string;
      readonly b: number | null;
      readonly c?: number;
    }

    const schema = ObjectParser({
      a: StringParser(),
      b: NumberParser({ nullable: true }),
      c: NumberParser({ optional: true })
    });

    // Mismatch between validation schema and type schema will show as a compile time type error here...
    const answer: Schema = assertValid(schema, {
      a: 'foo',
      b: null,
      c: undefined
    });

Please see `index.spec.ts` for more examples.

## Inferring a type from the schema

    const thing: ParserReturn<typeof schema> = {
      ...
    };

## Notes

This library is a work in progress however I am already using it in two major projects. Feedback is welcome.
