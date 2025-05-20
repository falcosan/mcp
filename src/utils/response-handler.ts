const TRAILING_COMMA_REGEX = /,\s*([}\]])/g;
const SINGLE_LINE_COMMENT_REGEX = /\/\/[^\r\n]*/g;
const THINK_TAG_REGEX = /<think>[\s\S]*?<\/think>/g;
const MULTI_LINE_COMMENT_REGEX = /\/\*[\s\S]*?\*\//g;
const FENCE_REGEX = /^```(?:json)?\s*([\s\S]*?)\s*```$/;
const JSON_TAG_REGEX = /<json>\s*([\s\S]*?)\s*<\/json>/;
const UNQUOTED_KEYS_REGEX = /([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;

/**
 * Transforms a string, potentially containing JSON embedded in Markdown
 * or with non-standard features like comments and trailing commas,
 * into a valid JavaScript object or array.
 *
 * @param markdownJsonString The string potentially containing the JSON.
 * @returns A parsed JavaScript object/array, or null if parsing fails.
 */
export function markdownToJson<T>(markdownJsonString: string): T | null {
  if (typeof markdownJsonString !== "string") return null;

  let jsonString = markdownJsonString.trim();

  if (!jsonString) return null;

  const fenceMatch = jsonString.match(FENCE_REGEX);
  if (fenceMatch && fenceMatch[1] !== undefined) {
    jsonString = fenceMatch[1].trim();
  } else {
    const jsonTagMatch = jsonString.match(JSON_TAG_REGEX);
    if (jsonTagMatch && jsonTagMatch[1] !== undefined) {
      jsonString = jsonTagMatch[1].trim();
    }
  }

  if (jsonString === "") return null;

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(jsonString);
  } catch {
    let cleanedJson = jsonString;

    cleanedJson = cleanedJson.replace(SINGLE_LINE_COMMENT_REGEX, "");
    cleanedJson = cleanedJson.replace(MULTI_LINE_COMMENT_REGEX, "");
    cleanedJson = cleanedJson.replace(THINK_TAG_REGEX, "");
    cleanedJson = cleanedJson.trim();

    if (cleanedJson === "") return null;

    cleanedJson = cleanedJson.replace(TRAILING_COMMA_REGEX, "$1");
    cleanedJson = cleanedJson.replace(UNQUOTED_KEYS_REGEX, '$1"$2":');

    try {
      parsedJson = JSON.parse(cleanedJson);
    } catch (error) {
      console.error("Failed to parse JSON after transformations.");
      console.error("Original string:", markdownJsonString);
      console.error("String after extraction (before cleaning):", jsonString);
      console.error("Processed string that failed parsing:", cleanedJson);
      console.error("Error:", error);
      return null;
    }
  }

  try {
    return parseNestedJsonStrings(parsedJson) as T;
  } catch (error) {
    console.error("Error during nested JSON string parsing:");
    console.error("Parsed object before nested parsing:", parsedJson);
    console.error("Error:", error);
    return null;
  }
}

function tryParseJsonString(str: string) {
  if (
    typeof str === "string" &&
    str.length >= 2 &&
    ((str.startsWith("{") && str.endsWith("}")) ||
      (str.startsWith("[") && str.endsWith("]")))
  ) {
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  }
  return str;
}

function parseNestedJsonStrings(obj: any): unknown {
  if (Array.isArray(obj)) {
    return obj.map(parseNestedJsonStrings);
  }
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = parseNestedJsonStrings(obj[key]);
      }
    }
    return result;
  }
  if (typeof obj === "string") {
    return tryParseJsonString(obj);
  }
  return obj;
}

/**
 * Recursively removes null values from an object, replacing them with undefined
 * This ensures optional parameters are properly handled by JSON schema validation
 */
export function convertNullToUndefined(
  obj: unknown,
  seen: WeakMap<object, unknown> = new WeakMap()
): unknown {
  if (obj === null) return undefined;
  if (obj === undefined || typeof obj !== "object") return obj;
  if (seen.has(obj)) return seen.get(obj);
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);

  if (Array.isArray(obj)) {
    const result: unknown[] = [];

    seen.set(obj, result);

    for (const item of obj) {
      result.push(convertNullToUndefined(item, seen));
    }

    return result;
  }

  const result: Record<string, unknown> = {};
  seen.set(obj, result);
  const keys = Object.keys(obj);

  for (const key of keys) {
    const value = (obj as Record<string, unknown>)[key];
    result[key] = convertNullToUndefined(value, seen);
  }

  return result;
}
