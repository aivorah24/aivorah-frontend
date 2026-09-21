// Unit tests for messageFormat.ts — pure functions, no mocking needed.
import {
  formatTime, sameDay, formatDateDivider, parseContent, formatFileSize,
  fileIcon, isAivorah, roleLabel, convoRoleLabel, formatPreview,
} from '../../utils/messageFormat';
import { AIVORAH_EMAIL } from '../../constants';

describe('sameDay', () => {
  test('true for the same calendar date', () => {
    expect(sameDay(new Date('2026-08-25T01:00:00'), new Date('2026-08-25T23:00:00'))).toBe(true);
  });
  test('false across a date boundary', () => {
    expect(sameDay(new Date('2026-08-25T23:59:00'), new Date('2026-08-26T00:01:00'))).toBe(false);
  });
});

describe('formatTime', () => {
  test('today returns a time string, not "Yesterday" or a weekday', () => {
    const iso = new Date().toISOString();
    const result = formatTime(iso);
    expect(result).not.toBe('Yesterday');
    expect(result).toMatch(/\d/);
  });
  test('exactly 1 day ago returns "Yesterday"', () => {
    const d = new Date(Date.now() - 86400000);
    expect(formatTime(d.toISOString())).toBe('Yesterday');
  });
  test('3 days ago returns a weekday label, not a date', () => {
    const d = new Date(Date.now() - 3 * 86400000);
    const result = formatTime(d.toISOString());
    expect(result).not.toBe('Yesterday');
    expect(result.length).toBeLessThan(10); // short weekday, not "25 Aug"-style
  });
  test('8+ days ago returns a day/month date', () => {
    const d = new Date(Date.now() - 10 * 86400000);
    const result = formatTime(d.toISOString());
    expect(result).not.toBe('Yesterday');
  });
});

describe('formatDateDivider', () => {
  test('today returns "Today"', () => {
    expect(formatDateDivider(new Date().toISOString())).toBe('Today');
  });
  test('yesterday returns "Yesterday"', () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    expect(formatDateDivider(y.toISOString())).toBe('Yesterday');
  });
  test('older dates return a full day/month/year label', () => {
    const old = new Date();
    old.setDate(old.getDate() - 20);
    const result = formatDateDivider(old.toISOString());
    expect(result).not.toBe('Today');
    expect(result).not.toBe('Yesterday');
  });
});

describe('parseContent', () => {
  test('plain text content returns as-is with no attachment', () => {
    expect(parseContent('hello there')).toEqual({ text: 'hello there' });
  });
  test('JSON content with an attachment field is parsed', () => {
    const att = { url: 'https://x/y.png', name: 'y.png', size: 123, type: 'image/png' };
    const raw = JSON.stringify({ text: 'see attached', attachment: att });
    expect(parseContent(raw)).toEqual({ text: 'see attached', attachment: att });
  });
  test('malformed JSON starting with "{" falls back to plain text, not a throw', () => {
    expect(parseContent('{not valid json')).toEqual({ text: '{not valid json' });
  });
  test('JSON object without an attachment field falls back to plain text', () => {
    const raw = JSON.stringify({ foo: 'bar' });
    expect(parseContent(raw)).toEqual({ text: raw });
  });
});

describe('formatFileSize', () => {
  test('under 1KB shown in bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });
  test('under 1MB shown in KB with one decimal', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });
  test('1MB+ shown in MB with one decimal', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('fileIcon', () => {
  test.each([
    ['application/pdf', 'file-text'],
    ['image/png', 'image'],
    ['image/jpeg', 'image'],
    ['doc', 'file-text'],
    ['docx', 'file-text'],
    ['xlsx', 'grid'],
    ['csv', 'grid'],
    ['ppt', 'monitor'],
    ['application/zip', 'paperclip'],
  ])('%s -> %s', (type, expected) => {
    expect(fileIcon(type)).toBe(expected);
  });
});

describe('isAivorah / roleLabel / convoRoleLabel', () => {
  test('isAivorah matches by system email', () => {
    expect(isAivorah({ otherEmail: AIVORAH_EMAIL })).toBe(true);
  });
  test('isAivorah matches by name fallback', () => {
    expect(isAivorah({ otherEmail: 'someone@else.com', otherName: 'Aivorah' })).toBe(true);
  });
  test('isAivorah is false for a normal contact', () => {
    expect(isAivorah({ otherEmail: 'parent@x.com', otherName: 'Jane' })).toBe(false);
  });
  test('isAivorah handles null/undefined safely', () => {
    expect(isAivorah(null)).toBe(false);
    expect(isAivorah(undefined)).toBe(false);
  });

  test('roleLabel maps teacher/school_admin to Staff, everything else to Parent', () => {
    expect(roleLabel('teacher')).toBe('Staff');
    expect(roleLabel('school_admin')).toBe('Staff');
    expect(roleLabel('parent')).toBe('Parent');
    expect(roleLabel('student')).toBe('Parent');
  });

  test('convoRoleLabel shows "Learning Buddy" for the Aivorah system contact', () => {
    expect(convoRoleLabel({ otherEmail: AIVORAH_EMAIL, otherName: 'Aivorah', otherRole: 'teacher' })).toBe('Learning Buddy');
  });
  test('convoRoleLabel defers to roleLabel for a normal contact', () => {
    expect(convoRoleLabel({ otherEmail: 'p@x.com', otherName: 'Jane', otherRole: 'parent' })).toBe('Parent');
  });
});

describe('formatPreview', () => {
  test('empty content returns empty string', () => {
    expect(formatPreview('')).toBe('');
  });
  test('SCHEDULE_CARD payload becomes a friendly summary, not the raw delimited string', () => {
    expect(formatPreview('SCHEDULE_CARD|Sai|Study Session|2026-09-25|10:00')).toBe('📅 Scheduled: Study Session');
  });
  test('SCHEDULE_CARD with no title falls back to "Event"', () => {
    expect(formatPreview('SCHEDULE_CARD||')).toBe('📅 Scheduled: Event');
  });
  test('auto-logout marker becomes a friendly message', () => {
    expect(formatPreview('[Auto-Logout] session expired')).toBe('Session ended automatically');
  });
  test('new-assignment notices are shortened', () => {
    expect(formatPreview('Teacher X New Assignment assigned: Chapter 5 Quiz')).toBe('New assignment: Chapter 5 Quiz');
  });
  test('an attachment-only message shows a paperclip + file name', () => {
    const content = JSON.stringify({ text: '', attachment: { url: 'https://x/doc.pdf', name: 'doc.pdf', size: 2048, type: 'application/pdf' } });
    expect(formatPreview(content)).toBe('📎 doc.pdf');
  });
  test('plain text passes through unchanged', () => {
    expect(formatPreview('Hey, are we still on for tomorrow?')).toBe('Hey, are we still on for tomorrow?');
  });
});
