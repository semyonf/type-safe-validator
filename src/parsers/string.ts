import Joi from 'joi';
import {
  buildJoiSchemaWithOptions,
  checkEmpty,
  ParserInput,
  ParserResult,
  StandardOptions,
  StandardOptionsReturn,
  ValidationError,
  ValidationFail,
  JOI_TOKEN
} from './common';

interface StringOptions extends StandardOptions {
  readonly allowNumeric?: boolean;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly regExp?: RegExp;
  readonly example?: string;
}

export const StringParser = <TOptions extends StringOptions>(
  options?: TOptions
) => (
  inp: ParserInput
): ParserResult<string | StandardOptionsReturn<TOptions>> => {
  if (inp.value === JOI_TOKEN) {
    let joiStringSchema = buildJoiSchemaWithOptions(Joi.string(), options);

    if (options && options.example) {
      joiStringSchema = joiStringSchema.example(options.example);
    }

    return joiStringSchema as any;
  }

  const emptyResult = checkEmpty(inp, options);

  if (emptyResult) {
    return emptyResult;
  }

  if (typeof inp.value !== 'string') {
    return {
      value: ValidationFail,
      errors: [
        {
          path: inp.path,
          message: `Value "${inp.value}" is not a string`
        }
      ]
    };
  }

  const errors: ValidationError[] = [];

  if (options) {
    if (typeof options.minLength === 'number') {
      if (inp.value.length < options.minLength) {
        errors.push({
          path: inp.path,
          message: `Value "${inp.value}" must be a least ${options.minLength} characters`
        });
      }
    }

    if (typeof options.maxLength === 'number') {
      if (inp.value.length > options.maxLength) {
        errors.push({
          path: inp.path,
          message: `Value "${inp.value}" must be at most ${options.maxLength} characters`
        });
      }
    }

    if (options.regExp) {
      if (!options.regExp.test(inp.value)) {
        errors.push({
          path: inp.path,
          message: `Value "${inp.value}" must be at most ${options.maxLength} characters`
        });
      }
    }
  }

  if (errors.length) {
    return {
      value: ValidationFail,
      errors
    };
  }

  return {
    value: inp.value,
    errors: []
  };
};
