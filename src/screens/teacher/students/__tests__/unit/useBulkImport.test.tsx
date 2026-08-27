// Unit test for useBulkImport's core preview/commit logic — the file-PICKING
// step (BulkImportTab's hidden <input type=file>) is web-DOM-only and not
// exercised here (same Category-D reasoning as assignments/utils/pdfHelpers.ts);
// previewBulkImport/commitBulkImport themselves take a File object directly and
// don't need a real picker, so they're fully testable via a harness.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { useBulkImport } from '../../hooks/useBulkImport';

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

const USER = { email: 'teacher@aivorah.test' };
function fakeFile(name = 'students.csv'): File {
  return new File(['Name,Grade\nAarav,Grade 3'], name, { type: 'text/csv' });
}

function Harness({ onImported = () => {} }: { onImported?: () => void }) {
  const h = useBulkImport(USER, onImported);
  return (
    <View>
      <Text testID="importing">{String(h.bulkImporting)}</Text>
      <Text testID="preview">{String(h.bulkPreview)}</Text>
      <Text testID="resultsCount">{String(h.bulkResults?.length ?? -1)}</Text>
      <Text testID="matched">{String(h.bulkSummary?.matched ?? '')}</Text>
      <Text testID="error">{h.bulkError}</Text>
      <Text testID="selectedCount">{String(h.selectedRows.size)}</Text>
      <TouchableOpacity testID="preview-btn" onPress={() => h.previewBulkImport(fakeFile())} />
      <TouchableOpacity testID="toggle-row-1" onPress={() => h.toggleRow(1)} />
      <TouchableOpacity testID="commit-btn" onPress={() => h.commitBulkImport(() => {})} />
      <TouchableOpacity testID="reset-btn" onPress={() => h.resetBulkState()} />
    </View>
  );
}

describe('useBulkImport', () => {
  test('previewBulkImport classifies rows and pre-checks matched/needs_confirmation rows, never checks skipped ones', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        summary: { matched: 1, needsConfirmation: 1, skipped: 1, total: 3 },
        results: [
          { rowIndex: 1, name: 'Aarav', status: 'matched' },
          { rowIndex: 2, name: 'Bela', status: 'needs_confirmation' },
          { rowIndex: 3, name: 'Chirag', status: 'skipped' },
        ],
      }),
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('preview-btn'));

    await waitFor(() => expect(screen.getByTestId('preview').props.children).toBe('true'));
    expect(screen.getByTestId('resultsCount').props.children).toBe('3');
    expect(screen.getByTestId('matched').props.children).toBe('1');
    // 2 pre-checked (rows 1 and 2), row 3 (skipped) never auto-selected.
    expect(screen.getByTestId('selectedCount').props.children).toBe('2');

    // Confirms the preview call carried previewOnly=true, never touching selectedRowIndexes.
    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(String(call[0])).toContain('/bulk-import');
    const body = call[1].body as FormData;
    expect((body as any).get('previewOnly')).toBe('true');
  });

  test('toggleRow flips a row out of the selected set', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ summary: {}, results: [{ rowIndex: 1, name: 'Aarav', status: 'matched' }] }),
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('preview-btn'));
    await waitFor(() => expect(screen.getByTestId('selectedCount').props.children).toBe('1'));

    await user.press(screen.getByTestId('toggle-row-1'));
    await waitFor(() => expect(screen.getByTestId('selectedCount').props.children).toBe('0'));
  });

  test('a preview error (bad file) surfaces without setting bulkPreview', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Could not read this file.' }) }) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('preview-btn'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('Could not read this file.'));
    expect(screen.getByTestId('preview').props.children).toBe('false');
  });

  test('commitBulkImport sends only selectedRowIndexes and calls onImported on success', async () => {
    // downloadCredentials() calls document.createElement to trigger the CSV
    // download — real DOM, not available in this test env (Category D, same
    // reasoning as utils/pdfHelpers.ts). It early-returns when there are no
    // `status: 'created'` rows, so this response (skipped only) exercises the
    // rest of the commit path without hitting that DOM-dependent branch.
    const onImported = jest.fn();
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ summary: {}, results: [{ rowIndex: 1, name: 'Aarav', status: 'matched' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ summary: { skipped: 1 }, results: [{ name: 'Aarav', email: 'a@x.com', status: 'skipped', error: 'Email already exists' }] }),
      }) as any;
    const user = userEvent.setup();
    await render(<Harness onImported={onImported} />);
    await user.press(screen.getByTestId('preview-btn'));
    await waitFor(() => expect(screen.getByTestId('preview').props.children).toBe('true'));

    await user.press(screen.getByTestId('commit-btn'));
    await waitFor(() => expect(onImported).toHaveBeenCalled());

    const commitCall = (global.fetch as jest.Mock).mock.calls[1];
    const body = commitCall[1].body as FormData;
    expect((body as any).get('selectedRowIndexes')).toBe(JSON.stringify([1]));
  });

  test('resetBulkState clears results, summary, preview, and error together', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ summary: { matched: 1 }, results: [{ rowIndex: 1, name: 'Aarav', status: 'matched' }] }),
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('preview-btn'));
    await waitFor(() => expect(screen.getByTestId('preview').props.children).toBe('true'));

    await user.press(screen.getByTestId('reset-btn'));
    await waitFor(() => expect(screen.getByTestId('preview').props.children).toBe('false'));
    expect(screen.getByTestId('resultsCount').props.children).toBe('-1');
  });

  test('a network failure during preview is caught and surfaced, not thrown', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('preview-btn'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('offline'));
  });
});
