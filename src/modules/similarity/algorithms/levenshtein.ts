/**
 * Levenshtein edit distance between two strings.
 */
function levenshteinDistance(s1: string, s2: string): number {
  const a = s1.toLowerCase();
  const b = s2.toLowerCase();

  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Use two-row optimization instead of full matrix
  let prevRow = new Array<number>(b.length + 1);
  let currRow = new Array<number>(b.length + 1);

  for (let j = 0; j <= b.length; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    currRow[0] = i;

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1, // deletion
        currRow[j - 1] + 1, // insertion
        prevRow[j - 1] + cost // substitution
      );
    }

    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[b.length];
}

/**
 * Levenshtein similarity normalized to 0-1.
 * @returns Score from 0 (completely different) to 1 (identical)
 */
export function levenshteinSimilarity(s1: string, s2: string): number {
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLen;
}
