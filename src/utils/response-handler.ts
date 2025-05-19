/**
 * Transforms a string, potentially containing JSON embedded in Markdown
 * or with non-standard features like comments and trailing commas,
 * into a valid JavaScript object or array.
 *
 * @param markdownJsonString The string potentially containing the JSON.
 * @returns A parsed JavaScript object/array, or null if parsing fails.
 */
export function markdownToJson<T>(markdownJsonString: string): T | null {
  if (typeof markdownJsonString !== "string" || !markdownJsonString.trim()) {
    return null;
  }

  let S = markdownJsonString.trim();

  const fenceRegex = /^```(?:json)?\s*([\s\S]*?)\s*```$/;
  const fenceMatch = S.match(fenceRegex);
  if (fenceMatch && fenceMatch[1]) {
    S = fenceMatch[1].trim();
  } else {
    const jsonTagRegex = /<json>\s*([\s\S]*?)\s*<\/json>/;
    const jsonTagMatch = S.match(jsonTagRegex);
    if (jsonTagMatch && jsonTagMatch[1]) {
      S = jsonTagMatch[1].trim();
    }
  }

  if (S === "") return null;

  S = S.replace(/\/\/[^\r\n]*/g, "");
  S = S.replace(/\/\*[\s\S]*?\*\//g, "");
  S = S.replace(/,\s*([}\]])/g, "$1");
  S = S.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

  try {
    const parsedJson = JSON.parse(S);
    return parseNestedJsonStrings(parsedJson);
  } catch (error) {
    console.error("Failed to parse JSON after transformations.");
    console.error("Original string:", markdownJsonString);
    console.error("Processed string that failed:", S);
    console.error("Error:", error);
    return null;
  }
}

function tryParseJsonString(str: string): any {
  try {
    if (
      typeof str === "string" &&
      ((str.startsWith("[") && str.endsWith("]")) ||
        (str.startsWith("{") && str.endsWith("}")))
    ) {
      return JSON.parse(str);
    }
    return str;
  } catch {
    return str;
  }
}

function parseNestedJsonStrings(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => parseNestedJsonStrings(item));
  } else if (obj !== null && typeof obj === "object") {
    const result: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      result[key] = parseNestedJsonStrings(obj[key]);
    }
    return result;
  } else if (typeof obj === "string") {
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
