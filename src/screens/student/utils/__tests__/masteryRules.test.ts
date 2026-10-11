import { PASS_THRESHOLD, MASTERY_THRESHOLD, isTopicMastered, isPassingScore, isMasteryScore } from '../masteryRules';

// Boundary tests for the centralized thresholds (RCA Phase 3B, gate 5).
// Values are provisional per product decision but must not drift from
// 60/80 without separate approval — these tests pin the current values.
describe('masteryRules thresholds', () => {
  test('PASS_THRESHOLD is 60, MASTERY_THRESHOLD is 80', () => {
    expect(PASS_THRESHOLD).toBe(60);
    expect(MASTERY_THRESHOLD).toBe(80);
  });

  describe('isPassingScore', () => {
    test.each([
      [59, false],
      [60, true],
      [61, true],
    ])('score %i -> %s', (score, expected) => {
      expect(isPassingScore(score)).toBe(expected);
    });
  });

  describe('isMasteryScore', () => {
    test.each([
      [79, false],
      [80, true],
      [81, true],
    ])('score %i -> %s', (score, expected) => {
      expect(isMasteryScore(score)).toBe(expected);
    });
  });

  describe('isTopicMastered', () => {
    test.each([
      [79, false],
      [80, true],
      [81, true],
    ])('avgScore %i with empty completedSet -> %s', (score, expected) => {
      expect(isTopicMastered('Topic', new Set(), score)).toBe(expected);
    });

    test('topic in completedSet is mastered regardless of avgScore', () => {
      expect(isTopicMastered('Topic', new Set(['Topic']), 0)).toBe(true);
      expect(isTopicMastered('Topic', new Set(['Topic']), null)).toBe(true);
    });

    test('null/undefined avgScore with empty completedSet -> not mastered', () => {
      expect(isTopicMastered('Topic', new Set(), null)).toBe(false);
      expect(isTopicMastered('Topic', new Set(), undefined)).toBe(false);
    });
  });
});
