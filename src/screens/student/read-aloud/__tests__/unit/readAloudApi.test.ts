import LEARNING_PATHS_SERVER_URL from '../../../../../config/learningPathsServerUrl';
import {
  assessReading, fetchCalibrationPassage, fetchLexile, fetchPassage, fetchPassageList, fetchSpeech, saveLexile, transcribeLive, transcribeRecording,
} from '../../services/readAloudApi';

let mockUser: any = { getIdToken: async () => 'tok-1' };
jest.mock('../../../../../config/firebase', () => ({
  auth: { get currentUser() { return mockUser; }, authStateReady: async () => {} },
}));

const BASE = `${LEARNING_PATHS_SERVER_URL}/read-aloud`;
const ok = (body: unknown) => Promise.resolve({ ok: true, json: async () => body });
const fail = (status: number, body: unknown) => Promise.resolve({ ok: false, status, json: async () => body });

beforeEach(() => {
  mockUser = { getIdToken: async () => 'tok-1' };
  global.fetch = jest.fn(() => ok({})) as any;
});

const call = (i = 0) => (global.fetch as jest.Mock).mock.calls[i];

describe('readAloudApi (signed-in student, no email sent)', () => {
  test('lexile GET + POST', async () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(ok({ lexile: null, needsCalibration: true }));
    await expect(fetchLexile()).resolves.toEqual({ lexile: null, needsCalibration: true });
    expect(call()[0]).toBe(`${BASE}/lexile`);
    expect(call()[1].headers.Authorization).toBe('Bearer tok-1');

    await saveLexile(500, 'calibration');
    expect(call(1)[1]).toEqual(expect.objectContaining({ method: 'POST', body: JSON.stringify({ lexile: 500, source: 'calibration' }) }));
    expect(call(1)[1].headers['Content-Type']).toBe('application/json');
  });

  test('passage list builds the query and skips a missing lexile', async () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(ok({ passages: [{ title: 'A' }] }));
    await expect(fetchPassageList('Grade 4', null)).resolves.toEqual([{ title: 'A' }]);
    expect(call()[0]).toBe(`${BASE}/passages?grade=Grade+4`);
    await fetchPassageList('Grade 4', 450);
    expect(call(1)[0]).toBe(`${BASE}/passages?grade=Grade+4&lexile=450`);
    await expect(fetchPassageList('Grade 4', null)).resolves.toEqual([]);
  });

  test('passage by title, surprise passage, and a reply without text is an error', async () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(ok({ title: 'T', text: 'Hello there' }));
    await expect(fetchPassage('Grade 3', 'T')).resolves.toEqual({ title: 'T', text: 'Hello there' });
    expect(JSON.parse(call()[1].body)).toEqual({ grade: 'Grade 3', topic: 'T' });
    (global.fetch as jest.Mock).mockReturnValueOnce(ok({ title: 'X' }));
    await expect(fetchPassage('Grade 3')).rejects.toThrow('Could not load passage');
    expect(JSON.parse(call(1)[1].body)).toEqual({ grade: 'Grade 3' });
  });

  test('server errors surface their message, or a fallback', async () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(fail(403, { error: 'No student account found for this identity' }));
    await expect(fetchCalibrationPassage('Grade 3')).rejects.toThrow('No student account found');
    (global.fetch as jest.Mock).mockReturnValueOnce(Promise.resolve({ ok: false, status: 502, json: async () => { throw new Error('html'); } }));
    await expect(fetchSpeech('text')).rejects.toThrow('Narration unavailable');
  });

  test('signed out: no request is made', async () => {
    mockUser = null;
    await expect(fetchLexile()).rejects.toThrow('Not signed in.');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('recordings are sent as multipart with the passage', async () => {
    const blob = new Blob(['abc'], { type: 'audio/ogg' });
    await transcribeRecording(blob, 'The sun');
    const [url, init] = call();
    expect(url).toBe(`${BASE}/transcribe`);
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.body.get('passage')).toBe('The sun');
    expect(init.body.get('audio').name).toBe('recording.ogg');
    await transcribeLive(new Blob(['abc'], { type: 'audio/webm' }), 'The sun');
    expect(call(1)[0]).toBe(`${BASE}/transcribe-live`);
    expect(call(1)[1].body.get('audio').name).toBe('live.webm');
  });

  test('assess posts the reading', async () => {
    const body = { passage: 'a b', wordStatuses: ['correct', 'skipped'] as any, duration: 5, grade: 'Grade 3', topic: 'T' };
    await assessReading(body);
    expect(call()[0]).toBe(`${BASE}/assess`);
    expect(JSON.parse(call()[1].body)).toEqual(body);
  });
});
