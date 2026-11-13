/**
 * Mathematical and Text Answer Normalizer and Checker
 */

export function parseNumericValue(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(',', '.');

  // Handle fraction format "a/b"
  const fractionMatch = cleaned.match(/^([+-]?\d+(?:\.\d+)?)\s*\/\s*([+-]?\d+(?:\.\d+)?)$/);
  if (fractionMatch) {
    const num = parseFloat(fractionMatch[1]);
    const den = parseFloat(fractionMatch[2]);
    if (den !== 0 && !isNaN(num) && !isNaN(den)) {
      return num / den;
    }
  }

  // Handle standard decimal or integer
  const num = parseFloat(cleaned);
  if (!isNaN(num) && isFinite(num) && /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(cleaned)) {
    return num;
  }

  return null;
}

export function normalizeString(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/,/g, '.');
}

/**
 * Checks if a student's answer matches any accepted answer
 * Supports:
 * - Direct text matching (case-insensitive, whitespace normalized)
 * - Comma as decimal dot ("0,5" == "0.5")
 * - Fractions ("1/2" == "0.5" == "0.50")
 * - Configurable numeric tolerance (e.g. 0.01)
 */
export function checkAnswer(
  studentAnswer: string,
  acceptedAnswers: string[],
  tolerance: number = 0
): boolean {
  if (!studentAnswer || !acceptedAnswers || acceptedAnswers.length === 0) {
    return false;
  }

  const normalizedStudentStr = normalizeString(studentAnswer);
  const studentNum = parseNumericValue(studentAnswer);

  for (const accepted of acceptedAnswers) {
    const normalizedAcceptedStr = normalizeString(accepted);

    // Exact normalized text match
    if (normalizedStudentStr === normalizedAcceptedStr) {
      return true;
    }

    // Numeric comparison (if both are valid numbers or fractions)
    const acceptedNum = parseNumericValue(accepted);
    if (studentNum !== null && acceptedNum !== null) {
      const allowedDiff = Math.max(0, tolerance);
      if (Math.abs(studentNum - acceptedNum) <= allowedDiff + 1e-9) {
        return true;
      }
    }
  }

  return false;
}
