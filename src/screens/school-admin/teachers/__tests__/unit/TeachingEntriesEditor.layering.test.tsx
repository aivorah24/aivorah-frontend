import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import TeachingEntriesEditor, { emptyEntry } from '../../components/TeachingEntriesEditor';

const colors: any = new Proxy({}, { get: () => '#000' });

async function renderEditor(openDropdown: string | null) {
  return await render(
    <TeachingEntriesEditor
      entries={[emptyEntry('CBSE')]} onChange={() => {}} schoolCurriculumBase={null}
      colors={colors} openDropdown={openDropdown} setOpenDropdown={() => {}}
    />
  );
}

const rootZ = (r: Awaited<ReturnType<typeof renderEditor>>) => StyleSheet.flatten((r.getByTestId('teaching-entries-editor').props.style)).zIndex;

describe('TeachingEntriesEditor stacking', () => {
  test('sits above later siblings while a dropdown is open, so the menu is never painted over', async () => {
    expect(rootZ(await renderEditor('0-curriculum'))).toBeGreaterThanOrEqual(50);
  });

  test('does not claim a high layer when no dropdown is open', async () => {
    expect(rootZ(await renderEditor(null)) ?? 0).toBeLessThan(50);
  });
});
