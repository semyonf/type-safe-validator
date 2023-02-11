import Joi from 'joi';
import {
  checkEmpty,
  ParserInput,
  ParserResult,
  StandardOptions,
  StandardOptionsReturn,
  ValidationFail,
  JOI_TOKEN
} from './common';

export const CustomParser = <TValue, TOptions extends StandardOptions>(
  validation: (inp: ParserInput) => TValue,
  options?: TOptions
) => (
  inp: ParserInput
): ParserResult<TValue | StandardOptionsReturn<TOptions>> => {
  if (inp.value === JOI_TOKEN) {
    return Joi.any() as any;
  }

  const emptyResult = checkEmpty(inp, options);

  if (emptyResult) {
    return emptyResult;
  }

  try {
    const result = validation(inp);

    return {
      value: result,
      errors: []
    };
  } catch (err) {
    return {
      value: ValidationFail,
      errors: [{ path: inp.path, message: err.message }]
    };
  }
};
