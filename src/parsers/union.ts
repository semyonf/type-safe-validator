import Joi from 'joi';
import { ArrayElementType } from '../util';
import {
  buildJoiSchemaWithOptions,
  checkEmpty,
  Parser,
  ParserInput,
  ParserResult,
  StandardOptions,
  ValidationError,
  ValidationFail,
  JOI_TOKEN
} from './common';

interface UnionOptions extends StandardOptions {
  readonly key?: string;
}

export const UnionParser = <
  TSchema extends ReadonlyArray<Parser<any>>,
  TOptions extends UnionOptions
>(
  schema: TSchema,
  options?: TOptions
) => (inp: ParserInput): ParserResult<UnionSchemaToValue<TSchema>> => {
  if (inp.value === JOI_TOKEN) {
    const joiSchema = Joi.alternatives().try(
      ...schema.map(
        parser =>
          (parser({ value: JOI_TOKEN, path: [] }) as unknown) as Joi.Schema
      )
    );

    return buildJoiSchemaWithOptions(joiSchema, options) as any;
  }

  const emptyResult = checkEmpty(inp, options);

  if (emptyResult) {
    return emptyResult;
  }

  const errors: ValidationError[] = [];

  for (const parser of schema) {
    const parserResult = parser({
      path: [...inp.path, `Parser ${schema.indexOf(parser)}`],
      value: inp.value
    });

    if (parserResult.errors.length === 0) {
      return parserResult;
    }

    const key = options && options.key;

    if (key) {
      const objectKeyValue = inp.value[key];

      const objectSchema = (parserResult as any).schema;

      if (objectSchema[key]) {
        const literalParser: Parser<any> = objectSchema[key];

        const literalResult = literalParser({
          path: [],
          value: objectKeyValue
        });

        const literals: any[] = (literalResult as any).literals;

        if (literals && literals.length > 0) {
          if (literals.includes(objectKeyValue)) {
            errors.push(...parserResult.errors);
          }
        }
      }
    } else {
      errors.push(...parserResult.errors);
    }
  }

  return {
    value: ValidationFail,
    errors: [
      {
        path: inp.path,
        message: 'All union parsers failed validation'
      },
      ...errors
    ]
  };
};

type UnionSchemaToValue<
  TSchema extends ReadonlyArray<Parser<any>>
> = ArrayElementType<TSchema> extends Parser<infer TValue> ? TValue : never;
