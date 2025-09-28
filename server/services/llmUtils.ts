import JSON5 from 'json5';
import { LLM_CONFIG } from '../config/constants';

export const parseJSONFromString = (
  result: string,
  expectedType: (typeof LLM_CONFIG.RESPONSE_TYPES)[keyof typeof LLM_CONFIG.RESPONSE_TYPES]
): any => {
  const [startChar, endChar] =
    expectedType === LLM_CONFIG.RESPONSE_TYPES.OBJECT ? ['{', '}'] : ['[', ']'];

  const start = result.indexOf(startChar);
  const end = result.lastIndexOf(endChar);

  if (start === -1 || end === -1) {
    const stringifiedResult = JSON.stringify(result);

    console.error(`Bad JSON result
        \nresultStart:${stringifiedResult.slice(0, 500)}
        \nresultEnd: ${stringifiedResult.slice(stringifiedResult.length - 500)}
        `);

    throw new Error(`Unable to locate JSON (${expectedType})`);
  }

  return JSON5.parse(result.slice(start, end + 1));
};
