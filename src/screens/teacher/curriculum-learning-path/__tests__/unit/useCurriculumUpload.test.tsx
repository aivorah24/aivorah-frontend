import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { useCurriculumUpload } from '../../hooks/useCurriculumUpload';

jest.mock('../../../../../config/firebase', () => ({
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue('real-id-token') } },
}));
jest.mock('../../../../../config/learningPathsServerUrl', () => 'https://server.test');

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

const FILE = { name: 'syllabus.pdf', type: 'application/pdf', blob: new Blob(['x']) };

function Harness({ file = FILE }: { file?: typeof FILE }) {
  const h = useCurriculumUpload();
  return (
    <View>
      <Text testID="status">{h.curriculum?.status ?? ''}</Text>
      <Text testID="error">{h.error}</Text>
      <Text testID="busy">{String(h.busy)}</Text>
      <TouchableOpacity testID="upload" onPress={() => h.uploadFile(file)} />
    </View>
  );
}

function jsonResponse(body: any, ok = true) {
  return Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });
}

describe('useCurriculumUpload', () => {
  test('rejects an unsupported file type before calling the upload API', async () => {
    global.fetch = jest.fn() as any;
    const user = userEvent.setup();
    await render(<Harness file={{ name: 'a.png', type: 'image/png', blob: new Blob(['x']) }} />);
    await user.press(screen.getByTestId('upload'));

    await waitFor(() => expect(screen.getByTestId('error').props.children).toMatch(/PDF, DOCX and XLSX/));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('goes through upload -> processed -> generated end to end', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.endsWith('/teacher-curriculum/upload')) return jsonResponse({ curriculum: { id: 'c1', status: 'processing' }, jobId: 'j1' });
      if (url.endsWith('/teacher-curriculum/c1/generate')) return jsonResponse({ curriculum: { id: 'c1', status: 'generating' }, jobId: 'j2' });
      if (url.endsWith('/teacher-curriculum/c1')) {
        const call = (global.fetch as jest.Mock).mock.calls.filter((c) => c[0].endsWith('/teacher-curriculum/c1')).length;
        return jsonResponse({ curriculum: { id: 'c1', status: call <= 1 ? 'processed' : 'generated' } });
      }
      return jsonResponse({}, false);
    }) as any;

    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('upload'));

    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('generated'), { timeout: 5000 });
    expect(screen.getByTestId('busy').props.children).toBe('false');
    expect(screen.getByTestId('error').props.children).toBe('');
  });

  test('surfaces the extraction failure error and stops before generation', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.endsWith('/teacher-curriculum/upload')) return jsonResponse({ curriculum: { id: 'c1', status: 'processing' }, jobId: 'j1' });
      if (url.endsWith('/teacher-curriculum/c1')) return jsonResponse({ curriculum: { id: 'c1', status: 'failed', error: 'corrupt PDF' } });
      return jsonResponse({}, false);
    }) as any;

    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('upload'));

    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('corrupt PDF'));
    expect((global.fetch as jest.Mock).mock.calls.some((c) => c[0].endsWith('/generate'))).toBe(false);
  });

  test('surfaces a network/API error from the upload call itself', async () => {
    global.fetch = jest.fn().mockImplementation(() => jsonResponse({ error: 'Failed to store the uploaded file' }, false)) as any;

    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('upload'));

    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('Failed to store the uploaded file'));
  });
});
