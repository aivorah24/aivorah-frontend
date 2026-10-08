import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { useBulkImport } from '../../hooks/useBulkImport';

jest.mock('../../services/bulkImportService', () => ({ bulkCreateStudents: jest.fn() }));
import { bulkCreateStudents } from '../../services/bulkImportService';

function Harness() {
  const h = useBulkImport();
  return (
    <>
      <Text testID="error">{h.error}</Text>
      <Text testID="created">{h.result?.created.length ?? ''}</Text>
      <Text testID="namesCount">{h.names.length}</Text>
      <TouchableOpacity testID="setSchool" onPress={() => h.setSchool('TSRA')}><Text>s</Text></TouchableOpacity>
      <TouchableOpacity testID="setGrade" onPress={() => h.setGrade('Grade 5')}><Text>g</Text></TouchableOpacity>
      <TouchableOpacity testID="setCurriculum" onPress={() => h.setCurriculum('CBSE')}><Text>c</Text></TouchableOpacity>
      <TouchableOpacity testID="setNames" onPress={() => h.setNamesText('Asha\nBen')}><Text>n</Text></TouchableOpacity>
      <TouchableOpacity testID="submit" onPress={() => h.submit()}><Text>submit</Text></TouchableOpacity>
    </>
  );
}

describe('useBulkImport', () => {
  beforeEach(() => jest.clearAllMocks());

  it('validates required fields before calling the API', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('submit'));
    expect(screen.getByTestId('error').props.children).toBe('School name is required.');
    expect(bulkCreateStudents).not.toHaveBeenCalled();
  });

  it('submits parsed names with the class fields once everything is filled in', async () => {
    (bulkCreateStudents as jest.Mock).mockResolvedValueOnce({ created: [{ name: 'Asha', email: 'a@x', password: 'p', grade: 'Grade 5', curriculum: 'CBSE', school: 'TSRA' }], errors: [], total: 1 });
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setSchool'));
    await user.press(screen.getByTestId('setGrade'));
    await user.press(screen.getByTestId('setCurriculum'));
    await user.press(screen.getByTestId('setNames'));
    expect(screen.getByTestId('namesCount').props.children).toBe(2);

    await user.press(screen.getByTestId('submit'));
    await waitFor(() => expect(screen.getByTestId('created').props.children).toBe(1));
    expect(bulkCreateStudents).toHaveBeenCalledWith({ students: ['Asha', 'Ben'], grade: 'Grade 5', section: '', school: 'TSRA', curriculum: 'CBSE' });
  });
});
