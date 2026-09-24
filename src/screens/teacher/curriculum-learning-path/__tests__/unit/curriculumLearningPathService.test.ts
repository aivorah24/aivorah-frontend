jest.mock('../../../../../config/firebase', () => ({
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue('real-id-token') } },
}));
jest.mock('../../../../../config/learningPathsServerUrl', () => 'https://server.test');

import { auth } from '../../../../../config/firebase';
import {
  uploadCurriculum, getCurriculum, startGeneration, listCurricula, retryCurriculum, getLearningPath, saveLearningPathDraft, publishLearningPath,
} from '../../services/curriculumLearningPathService';

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; jest.clearAllMocks(); });

describe('curriculumLearningPathService', () => {
  test('uploadCurriculum sends the file as multipart with a Bearer token, no Content-Type override', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ curriculum: { id: 'c1' }, jobId: 'j1' }) }) as any;
    await uploadCurriculum({ name: 'a.pdf', mime: 'application/pdf', blob: new Blob(['x']) });

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://server.test/teacher-curriculum/upload');
    expect(options.headers.Authorization).toBe('Bearer real-id-token');
    expect(options.body).toBeInstanceOf(FormData);
  });

  test('uploadCurriculum keeps the "file" field name (required by the backend\'s multer config) and appends grade/subject/curriculum', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ curriculum: { id: 'c1' }, jobId: 'j1' }) }) as any;
    await uploadCurriculum(
      { name: 'a.pdf', mime: 'application/pdf', blob: new Blob(['x']) },
      { grade: 'Grade 6', subject: 'Mathematics', curriculum: 'CBSE' }
    );

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body: FormData = options.body;
    expect(body.get('file')).toBeTruthy();
    expect(body.get('grade')).toBe('Grade 6');
    expect(body.get('subject')).toBe('Mathematics');
    expect(body.get('curriculum')).toBe('CBSE');
  });

  test('uploadCurriculum omits grade/subject/curriculum fields entirely when no config is given', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ curriculum: { id: 'c1' }, jobId: 'j1' }) }) as any;
    await uploadCurriculum({ name: 'a.pdf', mime: 'application/pdf', blob: new Blob(['x']) });

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body: FormData = options.body;
    expect(body.get('grade')).toBeNull();
    expect(body.get('subject')).toBeNull();
    expect(body.get('curriculum')).toBeNull();
  });

  test('getCurriculum requests the given curriculum id with auth', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ curriculum: { id: 'c1', status: 'processed' } }) }) as any;
    const result = await getCurriculum('c1');
    expect(global.fetch).toHaveBeenCalledWith('https://server.test/teacher-curriculum/c1', expect.objectContaining({
      headers: { Authorization: 'Bearer real-id-token' },
    }));
    expect(result.curriculum.status).toBe('processed');
  });

  test('startGeneration posts to the generate endpoint', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ curriculum: { id: 'c1' }, jobId: 'j2' }) }) as any;
    await startGeneration('c1');
    expect(global.fetch).toHaveBeenCalledWith('https://server.test/teacher-curriculum/c1/generate', expect.objectContaining({ method: 'POST' }));
  });

  test('listCurricula requests the newest N and retryCurriculum posts to /retry', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ curricula: [] }) }) as any;
    await listCurricula(1);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('https://server.test/teacher-curriculum?limit=1');
    await retryCurriculum('c1');
    expect((global.fetch as jest.Mock).mock.calls[1]).toEqual(['https://server.test/teacher-curriculum/c1/retry', expect.objectContaining({ method: 'POST' })]);
  });

  test('getLearningPath fetches the draft', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ learningPath: { id: 'lp1' } }) }) as any;
    const result = await getLearningPath('c1');
    expect(result.learningPath.id).toBe('lp1');
  });

  test('saveLearningPathDraft PUTs the content as JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ learningPath: { id: 'lp1' } }) }) as any;
    const content = { version: 1, units: [] };
    await saveLearningPathDraft('c1', content as any);
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body)).toEqual({ content });
  });

  test('publishLearningPath posts to the publish endpoint', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ learningPath: { id: 'lp1', status: 'published' } }) }) as any;
    const result = await publishLearningPath('c1');
    expect(result.learningPath.status).toBe('published');
  });

  test('throws the server error message on a non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403, json: () => Promise.resolve({ error: 'Not authorized for this curriculum' }) }) as any;
    await expect(getCurriculum('c1')).rejects.toThrow('Not authorized for this curriculum');
  });

  test('throws when there is no signed-in user', async () => {
    (auth as any).currentUser = null;
    await expect(getCurriculum('c1')).rejects.toThrow('Not signed in.');
  });
});
