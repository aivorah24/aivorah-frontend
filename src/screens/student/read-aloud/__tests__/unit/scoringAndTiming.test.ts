import { buildWordBoundaries, estimatedWordIndex, timedWordIndex, wordWeight } from '../../utils/listenTiming';
import { alignServerStatuses, calibrationLexile, finalizeStatuses, formatDuration, localAssessment } from '../../utils/scoring';
import { levelMeta } from '../../utils/levelMeta';

describe('scoring', () => {
  test('calibration Lexile from the grade base, accuracy and speed', () => {
    expect(calibrationLexile('Grade 4', 96, 90)).toBe(600);
    expect(calibrationLexile('Grade 4', 85, 60)).toBe(500);
    expect(calibrationLexile('Grade 4', 70, 90)).toBe(400);
    expect(calibrationLexile('Grade 8', 85, 60)).toBe(400);
  });

  test('unreached words become skipped', () => {
    expect(finalizeStatuses(['correct', 'current', 'pending', 'misread'])).toEqual(['correct', 'skipped', 'skipped', 'misread']);
  });

  test('server statuses are fitted to the word count', () => {
    expect(alignServerStatuses(['correct', 'weird'], 3)).toEqual(['correct', 'pending', 'pending']);
    expect(alignServerStatuses(['correct', 'misread', 'skipped'], 2)).toEqual(['correct', 'misread']);
    expect(alignServerStatuses(undefined, 1)).toEqual(['pending']);
  });

  test('local fallback assessment', () => {
    const r = localAssessment(['correct', 'correct', 'correct', 'misread', 'skipped'], 30);
    expect(r).toEqual(expect.objectContaining({ accuracy: 60, wcpm: 6, wpm: 10, correct: 3, misread: 1, skipped: 1, level: 'developing' }));
    expect(r.feedback).toBe('Nice try! Practice makes perfect!');
    expect(localAssessment([], 0)).toEqual(expect.objectContaining({ accuracy: 0, wcpm: 0, level: 'needs-practice' }));
  });

  test('formats a duration', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(0)).toBe('0:00');
  });

  test('unknown levels fall back to easy', () => {
    expect(levelMeta('weird').label).toBe('Easy');
    expect(levelMeta('hard').label).toBe('Hard');
  });
});

describe('listen timing', () => {
  test('longer words and sentence ends weigh more', () => {
    expect(wordWeight('incredible')).toBeGreaterThan(wordWeight('cat'));
    expect(wordWeight('end.')).toBeGreaterThan(wordWeight('end'));
    expect(wordWeight('the')).toBeLessThan(1);
  });

  test('boundaries are cumulative and end at 1', () => {
    const b = buildWordBoundaries(['one', 'two', 'three.']);
    expect(b[b.length - 1]).toBe(1);
    expect(b[0]).toBeLessThan(b[1]);
  });

  test('timed index follows word start times', () => {
    const t = [{ startTime: 0, endTime: 0.4 }, { startTime: 0.5, endTime: 0.9 }, { startTime: 1, endTime: 1.5 }];
    expect(timedWordIndex(t, 0.2, 2)).toBe(0);
    expect(timedWordIndex(t, 0.7, 2)).toBe(1);
    expect(timedWordIndex(t, 1.9, 2)).toBe(2);
  });

  test('estimated index follows playback progress', () => {
    const b = [0.25, 0.5, 0.75, 1];
    expect(estimatedWordIndex(b, 0, 4)).toBe(0);
    expect(estimatedWordIndex(b, 2.5, 4)).toBe(2);
    expect(estimatedWordIndex(b, 5, 4)).toBe(3);
  });
});
