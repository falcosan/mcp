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
  }

  if (S === "") return null;

  S = S.replace(/\/\/[^\r\n]*/g, "");
  S = S.replace(/\/\*[\s\S]*?\*\//g, "");
  S = S.replace(/,\s*([}\]])/g, "$1");

  try {
    const parsedJson = JSON.parse(S);
    return parsedJson;
  } catch (error) {
    console.error("Failed to parse JSON after transformations.");
    console.error("Original string:", markdownJsonString);
    console.error("Processed string that failed:", S);
    console.error("Error:", error);
    return null;
  }
}
