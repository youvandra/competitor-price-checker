// Shared helpers used across marketplace adapters.

/**
 * Tidy a raw marketplace seller name. Strips bracketed/parenthesized suffixes
 * (e.g. "RichMondHS [S/N Recorded]" -> "RichMondHS") and trailing separators,
 * collapses whitespace. Falls back to the trimmed original if cleaning empties it.
 */
export function cleanSeller(name: string | undefined): string {
  if (!name) return "Unknown seller";
  const stripped = name
    .replace(/[\[(].*?[\])]/g, " ") // remove [ ... ] and ( ... ) groups
    .replace(/[\[(].*$/g, " ") // remove an unclosed trailing "[..." / "(..."
    .replace(/[-–—,:|]+\s*$/g, "") // trailing separators
    .replace(/\s+/g, " ")
    .trim();
  return stripped || name.trim() || "Unknown seller";
}
