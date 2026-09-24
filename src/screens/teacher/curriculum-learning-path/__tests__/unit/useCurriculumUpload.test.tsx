import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent, act } from '@testing-library/react-native';
import { useCurriculumUpload } from '../../hooks/useCurriculumUpload';

jest.mock('../../../../../config/firebase', () => ({
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue('real-id-token') } },
}));
jest.mock('../../../../../config/learningPathsServerUrl', () => 'https://server.test');

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; jest.useRealTimers(); });

const FILE = { name: 'syllabus.pdf', type: 'application/pdf', blob: new Blob(['x']) };

function Harness({ file = FILE }: { file?: typeof FILE }) {
  const h = useCurriculumUpload();
  return (
    <View>
      <Text testID="status">{h.curriculum?.status ?? ''}</Text>
      <Text testID="stage">{h.progress?.stage ?? ''}</Text>
      <Text testID="file">{h.fileName ?? ''}</Text>
      <Text testID="phase">{h.phase}</Text>
      <Text testID="error">{h.error}</Text>
      <Text testID="conn">{String(h.connectionIssue)}</Text>
      <TouchableOpacity testID="upload" onPress={() => h.uploadFile(file)} />
      <TouchableOpacity testID="retry" onPress={() => h.retry()} />
    </View>
  );
}

function jsonResponse(body: any, ok = true) {
  return Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });
}

const calls = (suffix: string) => (global.fetch as jest.Mock).mock.calls.filter((c) => c[0].endsWith(suffix));
const text = (id: string) => screen.getByTestId(id).props.children;
const noCurricula = () => jsonResponse({ curricula: [] });

describe('useCurriculumUpload', () => {
  test('rejects an unsupported file type before calling the upload API', async () => {
    global.fetch = jest.fn().mockImplementation(noCurricula) as any;
    const user = userEvent.setup();
    await render(<Harness file={{ name: 'a.png', type: 'image/png', blob: new Blob(['x']) }} />);
    await user.press(screen.getByTestId('upload'));

    await waitFor(() => expect(text('error')).toMatch(/PDF, DOCX and XLSX/));
    expect(calls('/upload')).toHaveLength(0);
  });

  test('file name and uploading phase are set before the POST resolves', async () => {
    let resolveUpload: (v: any) => void = () => {};
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('?limit=')) return noCurricula();
      if (url.endsWith('/upload')) return new Promise((r) => { resolveUpload = r; });
      return jsonResponse({ curriculum: { id: 'c1', status: 'generated' }, progress: null });
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('upload'));

    await waitFor(() => expect(text('phase')).toBe('uploading'));
    expect(text('file')).toBe('syllabus.pdf');

    await act(async () => {
      resolveUpload({ ok: true, json: () => Promise.resolve({ curriculum: { id: 'c1', status: 'processing' }, jobId: 'j' }) });
    });
    await waitFor(() => expect(text('status')).toBe('generated'));
  });

  test('follows real progress to generated and never calls /generate', async () => {
    let polls = 0;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('?limit=')) return noCurricula();
      if (url.endsWith('/upload')) return jsonResponse({ curriculum: { id: 'c1', status: 'processing' }, jobId: 'j1' });
      if (url.endsWith('/teacher-curriculum/c1')) {
        polls += 1;
        return jsonResponse(polls === 1
          ? { curriculum: { id: 'c1', status: 'generating' }, progress: { stage: 'generating', topicsDone: 1, topicsTotal: 4, updatedAt: 'x' } }
          : { curriculum: { id: 'c1', status: 'generated' }, progress: { stage: 'done', topicsDone: 4, topicsTotal: 4, updatedAt: 'x' } });
      }
      return jsonResponse({}, false);
    }) as any;

    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('upload'));

    await waitFor(() => expect(text('stage')).toBe('generating'));
    await waitFor(() => expect(text('status')).toBe('generated'), { timeout: 6000 });
    expect(calls('/generate')).toHaveLength(0);
  });

  test('long-running generation keeps polling and never becomes a timeout error', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('?limit=')) return jsonResponse({ curricula: [{ id: 'c1', file_name: 'a.pdf', status: 'generating' }] });
      return jsonResponse({ curriculum: { id: 'c1', file_name: 'a.pdf', status: 'generating' }, progress: null });
    }) as any;
    await render(<Harness />);
    await waitFor(() => expect(text('status')).toBe('generating'));

    for (let i = 0; i < 100; i++) await act(async () => { await jest.advanceTimersByTimeAsync(2500); });

    expect(text('error')).toBe('');
    expect(text('status')).toBe('generating');
    expect(calls('/teacher-curriculum/c1').length).toBeGreaterThan(90);
  });

  test('continues polling through transient failures and flags a connection issue', async () => {
    jest.useFakeTimers();
    let down = true;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('?limit=')) return jsonResponse({ curricula: [{ id: 'c1', file_name: 'a.pdf', status: 'processing' }] });
      if (down) return Promise.reject(new Error('network'));
      return jsonResponse({ curriculum: { id: 'c1', file_name: 'a.pdf', status: 'generated' }, progress: null });
    }) as any;
    await render(<Harness />);
    for (let i = 0; i < 4; i++) await act(async () => { await jest.advanceTimersByTimeAsync(2500); });
    expect(text('conn')).toBe('true');
    expect(text('status')).toBe('processing');

    down = false;
    await act(async () => { await jest.advanceTimersByTimeAsync(2500); });
    await waitFor(() => expect(text('status')).toBe('generated'));
    expect(text('conn')).toBe('false');
  });

  test('a failed upload POST surfaces the error and Retry re-sends the same file', async () => {
    let uploads = 0;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('?limit=')) return noCurricula();
      if (url.endsWith('/upload')) {
        uploads += 1;
        return uploads === 1
          ? jsonResponse({ error: 'Failed to store the uploaded file' }, false)
          : jsonResponse({ curriculum: { id: 'c1', status: 'generated' }, jobId: 'j' });
      }
      return jsonResponse({ curriculum: { id: 'c1', status: 'generated' }, progress: null });
    }) as any;

    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('upload'));
    await waitFor(() => expect(text('error')).toBe('Failed to store the uploaded file'));
    expect(text('phase')).toBe('upload_failed');
    expect(text('file')).toBe('syllabus.pdf');

    await user.press(screen.getByTestId('retry'));
    await waitFor(() => expect(text('status')).toBe('generated'));
    expect(uploads).toBe(2);
  });

  test('failed curriculum: Retry calls the retry endpoint then resumes polling', async () => {
    let retried = false;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('?limit=')) return jsonResponse({ curricula: [{ id: 'c1', file_name: 'a.pdf', status: 'failed', error: 'corrupt PDF' }] });
      if (url.endsWith('/retry')) {
        retried = true;
        return jsonResponse({ curriculum: { id: 'c1', file_name: 'a.pdf', status: 'processing' }, jobId: 'j' });
      }
      return jsonResponse({ curriculum: { id: 'c1', file_name: 'a.pdf', status: retried ? 'generated' : 'failed' }, progress: null });
    }) as any;

    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(text('status')).toBe('failed'));
    await user.press(screen.getByTestId('retry'));
    await waitFor(() => expect(text('status')).toBe('generated'));
    expect(calls('/c1/retry')).toHaveLength(1);
    expect((calls('/c1/retry')[0][1] as any).method).toBe('POST');
  });

  test('mount restores the latest curriculum: non-terminal resumes polling', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('?limit=1')) {
        return jsonResponse({ curricula: [{ id: 'c1', file_name: 'a.pdf', status: 'generating', progress: { stage: 'generating', topicsDone: 2, topicsTotal: 5, updatedAt: 'x' } }] });
      }
      return jsonResponse({ curriculum: { id: 'c1', file_name: 'a.pdf', status: 'generated' }, progress: null });
    }) as any;
    await render(<Harness />);
    await waitFor(() => expect(text('file')).toBe('a.pdf'));
    await waitFor(() => expect(text('status')).toBe('generated'));
    expect(calls('/teacher-curriculum/c1').length).toBeGreaterThan(0);
  });

  test('mount restores a generated curriculum without polling', async () => {
    global.fetch = jest.fn().mockImplementation(() => jsonResponse({ curricula: [{ id: 'c1', file_name: 'a.pdf', status: 'generated' }] })) as any;
    await render(<Harness />);
    await waitFor(() => expect(text('status')).toBe('generated'));
    expect(calls('/teacher-curriculum/c1')).toHaveLength(0);
  });
});
