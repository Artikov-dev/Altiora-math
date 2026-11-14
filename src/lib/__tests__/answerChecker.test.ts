import { describe, it, expect } from 'vitest';
import { checkAnswer, normalizeString, parseNumericValue } from '../answerChecker';

describe('answerChecker', () => {
  describe('normalizeString', () => {
    it('trims leading/trailing whitespace and lowercases', () => {
      expect(normalizeString('  X = 5  ')).toBe('x = 5');
    });

    it('replaces commas with dots', () => {
      expect(normalizeString('3,14')).toBe('3.14');
    });
  });

  describe('parseNumericValue', () => {
    it('parses standard integers and decimals', () => {
      expect(parseNumericValue('42')).toBe(42);
      expect(parseNumericValue('3.14')).toBe(3.14);
      expect(parseNumericValue('0,5')).toBe(0.5);
    });

    it('parses fractional representations correctly', () => {
      expect(parseNumericValue('1/2')).toBe(0.5);
      expect(parseNumericValue('3/4')).toBe(0.75);
      expect(parseNumericValue('2/1')).toBe(2);
      expect(parseNumericValue('-1/4')).toBe(-0.25);
    });

    it('returns null for non-numeric text', () => {
      expect(parseNumericValue('salom')).toBeNull();
      expect(parseNumericValue('')).toBeNull();
    });
  });

  describe('checkAnswer', () => {
    it('matches exact text case-insensitively', () => {
      expect(checkAnswer('Toshkent', ['toshkent'])).toBe(true);
      expect(checkAnswer('  tenglama  ', ['Tenglama'])).toBe(true);
    });

    it('matches comma and dot decimal formats', () => {
      expect(checkAnswer('0,5', ['0.5'])).toBe(true);
      expect(checkAnswer('0.5', ['0,5'])).toBe(true);
      expect(checkAnswer('2,75', ['2.75'])).toBe(true);
    });

    it('matches fractions with equivalent decimals', () => {
      expect(checkAnswer('1/2', ['0.5'])).toBe(true);
      expect(checkAnswer('0.5', ['1/2'])).toBe(true);
      expect(checkAnswer('0.50', ['1/2'])).toBe(true);
      expect(checkAnswer('3/4', ['0.75'])).toBe(true);
      expect(checkAnswer('4/2', ['2'])).toBe(true);
    });

    it('handles numeric tolerance', () => {
      // With tolerance of 0.05
      expect(checkAnswer('3.14', ['3.15'], 0.05)).toBe(true);
      // Without tolerance, should fail
      expect(checkAnswer('3.14', ['3.15'], 0)).toBe(false);
    });

    it('rejects incorrect answers', () => {
      expect(checkAnswer('0.6', ['0.5', '1/2'])).toBe(false);
      expect(checkAnswer('x=4', ['x=5'])).toBe(false);
      expect(checkAnswer('', ['1'])).toBe(false);
    });
  });
});
