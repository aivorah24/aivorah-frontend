import { pollJob, extractViaQueue, detectWorksheetMeta } from '../../services/jobsService';

describe('pollJob', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; jest.useRealTimers(); });

  test('polls the given serverUrl, not a hardcoded one', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ status: 'done', result: { ok: true } }) }) as any;
    await pollJob('job-1', 'https://assignments.test', { intervalMs: 1 });
    expect(fetch).toHaveBeenCalledWith('https://assignments.test/jobs/job-1');
  });

  test('returns job.result as soon as status is "done"', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ status: 'done', result: { ok: true } }) }) as any;
    const result = await pollJob('job-1', 'https://server.test', { intervalMs: 1 });
    expect(result).toEqual({ ok: true });
  });

  test('throws with the server-provided error when status is "failed"', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ status: 'failed', error: 'AI blew up' }) }) as any;
    await expect(pollJob('job-1', 'https://server.test', { intervalMs: 1 })).rejects.toThrow('AI blew up');
  });

  test('throws a generic message when failed with no error field', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ status: 'failed' }) }) as any;
    await expect(pollJob('job-1', 'https://server.test', { intervalMs: 1 })).rejects.toThrow('Processing failed. Please try again.');
  });

  test('keeps polling through "pending"/"processing" until done', async () => {
    let call = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      call++;
      const status = call < 3 ? 'processing' : 'done';
      return Promise.resolve({ json: () => Promise.resolve({ status, result: call >= 3 ? 'final' : undefined }) });
    }) as any;
    const result = await pollJob('job-1', 'https://server.test', { intervalMs: 1 });
    expect(result).toBe('final');
    expect(call).toBe(3);
  });

  test('times out if the job never resolves within timeoutMs', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ status: 'processing' }) }) as any;
    await expect(pollJob('job-1', 'https://server.test', { intervalMs: 1, timeoutMs: 5 })).rejects.toThrow(/Timed out/);
  });
});

describe('extractViaQueue', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  test('enqueues, polls, and returns the result on success', async () => {
    let jobsCall = 0;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('extract-questions-async')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ jobId: 'j1' }) });
      }
      jobsCall++;
      return Promise.resolve({ json: () => Promise.resolve({ status: jobsCall >= 1 ? 'done' : 'pending', result: { questions: [] } }) });
    }) as any;
    const result = await extractViaQueue('https://server.test', { doc: 'x' });
    expect(result).toEqual({ questions: [] });
  });

  test('falls back to the synchronous endpoint if enqueue fails', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('extract-questions-async')) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'queue down' }) });
      }
      if (String(url).includes('extract-questions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ questions: ['fallback result'] }) });
      }
      throw new Error('unexpected fetch: ' + url);
    }) as any;
    const result = await extractViaQueue('https://server.test', { doc: 'x' });
    expect(result).toEqual({ questions: ['fallback result'] });
  });

  test('a failing fallback surfaces the fallback error', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('extract-questions-async')) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'queue down' }) });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'both paths down' }) });
    }) as any;
    await expect(extractViaQueue('https://server.test', { doc: 'x' })).rejects.toThrow('both paths down');
  });
});

describe('detectWorksheetMeta', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });
  const file = { base64: 'PDF', mime: 'application/pdf', name: 'Revised_PYP4_-MHLE-29.pdf' };

  test('sends the file and its name, returns the printed grade/curriculum/chapter', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ grade: 'Grade 4', curriculum: 'IB PYP', chapter: 'MHLE-29' }) }) as any;
    await expect(detectWorksheetMeta(file, 'https://assignments.test')).resolves.toEqual({ grade: 'Grade 4', curriculum: 'IB PYP', chapter: 'MHLE-29' });
    const [url, init] = (fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://assignments.test/assignments/detect-meta');
    expect(JSON.parse(init.body)).toEqual({ fileBase64: 'PDF', mimeType: 'application/pdf', fileName: 'Revised_PYP4_-MHLE-29.pdf' });
  });

  test('a server error or network failure is null — the AI extraction still fills the form', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) }) as any;
    await expect(detectWorksheetMeta(file, 'https://s.test')).resolves.toBeNull();
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as any;
    await expect(detectWorksheetMeta(file, 'https://s.test')).resolves.toBeNull();
  });
});
