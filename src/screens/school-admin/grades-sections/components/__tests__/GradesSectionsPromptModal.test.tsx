import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import GradesSectionsPromptModal from '../GradesSectionsPromptModal';
import type { PromptState } from '../../types';

const colors = {
  textDim: '#6E736B', cardDark: '#141414', borderColor: 'rgba(245,243,238,0.14)',
  textHeading: '#F5F3EE', textMain: '#F5F3EE', textMuted: '#A9B0AC',
  accentRed: '#C98A8A', accentYellow: '#BAA467', bgDark: '#0B0B0B',
} as any;

function renderModal(prompt: PromptState, overrides: Partial<React.ComponentProps<typeof GradesSectionsPromptModal>> = {}) {
  const props = {
    prompt,
    value: '',
    onChangeValue: jest.fn(),
    error: '',
    busy: false,
    colors,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    ...overrides,
  };
  return { props, result: render(<GradesSectionsPromptModal {...props} />) };
}

describe('GradesSectionsPromptModal', () => {
  it('renders nothing visible when prompt is null', async () => {
    const { result } = renderModal(null);
    await result;
    expect(screen.queryByPlaceholderText('e.g. Grade 7')).toBeNull();
  });

  it('shows "Add Grade" title and placeholder for the addGrade prompt', async () => {
    const { result } = renderModal({ kind: 'addGrade' });
    await result;
    expect(screen.getByText('Add Grade')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. Grade 7')).toBeTruthy();
  });

  it('shows "Add Section to X" title and placeholder for the addSection prompt', async () => {
    const { result } = renderModal({ kind: 'addSection', grade: 'Grade 6' });
    await result;
    expect(screen.getByText('Add Section to Grade 6')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. B')).toBeTruthy();
  });

  it('shows "Rename X" title, the cascade hint, and "New name" placeholder for the renameGrade prompt', async () => {
    const { result } = renderModal({ kind: 'renameGrade', grade: 'Grade 6' });
    await result;
    expect(screen.getByText('Rename Grade 6')).toBeTruthy();
    expect(screen.getByPlaceholderText('New name')).toBeTruthy();
    expect(screen.getByText('Every student currently in this grade will be updated to the new name.')).toBeTruthy();
  });

  it('does not show the cascade hint for addGrade/addSection prompts', async () => {
    const { result } = renderModal({ kind: 'addGrade' });
    await result;
    expect(screen.queryByText('Every student currently in this grade will be updated to the new name.')).toBeNull();
  });

  it('shows the error message when provided', async () => {
    const { result } = renderModal({ kind: 'addGrade' }, { error: 'That grade already exists' });
    await result;
    expect(screen.getByText('That grade already exists')).toBeTruthy();
  });

  it('shows "Add" as the submit label for addGrade/addSection, "Rename" for renameGrade', async () => {
    const { result: r1 } = renderModal({ kind: 'addGrade' });
    await r1;
    expect(screen.getByText('Add')).toBeTruthy();
  });

  it('shows "Rename" as the submit label for renameGrade', async () => {
    const { result } = renderModal({ kind: 'renameGrade', grade: 'Grade 6' });
    await result;
    // Title and submit button both render "Rename Grade 6" / "Rename" — assert the button specifically via exact match count.
    expect(screen.getAllByText('Rename', { exact: true }).length).toBeGreaterThan(0);
  });

  it('shows a spinner instead of the submit label when busy', async () => {
    const { result } = renderModal({ kind: 'addGrade' }, { busy: true });
    await result;
    expect(screen.queryByText('Add')).toBeNull();
  });

  it('calls onChangeValue as the user types', async () => {
    const { props, result } = renderModal({ kind: 'addGrade' });
    await result;
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('e.g. Grade 7'), 'X');
    expect(props.onChangeValue).toHaveBeenCalledWith('X');
  });

  it('calls onSubmit when the submit button is pressed', async () => {
    const { props, result } = renderModal({ kind: 'addGrade' });
    await result;
    const user = userEvent.setup();
    await user.press(screen.getByText('Add'));
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel is pressed', async () => {
    const { props, result } = renderModal({ kind: 'addGrade' });
    await result;
    const user = userEvent.setup();
    await user.press(screen.getByText('Cancel'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close (X) icon is pressed', async () => {
    const { props, result } = renderModal({ kind: 'addGrade' });
    await result;
    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Close'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
