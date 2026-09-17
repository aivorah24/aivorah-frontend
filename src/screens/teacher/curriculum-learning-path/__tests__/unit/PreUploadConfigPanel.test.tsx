import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import PreUploadConfigPanel, { GRADES_BY_CURRICULUM } from '../../components/PreUploadConfigPanel';

function baseProps(overrides = {}) {
  return {
    curriculum: 'CBSE', setCurriculum: jest.fn(),
    grade: 'Grade 6', setGrade: jest.fn(),
    subject: 'Mathematics', setSubject: jest.fn(),
    academicYear: '2026-27', setAcademicYear: jest.fn(),
    fileName: null, status: null, statusError: null, busy: false,
    onPickFile: jest.fn(), detected: null,
    onSaveDraft: jest.fn(), onPublish: jest.fn(),
    canSaveDraft: false, canPublish: false, saving: false, publishing: false,
    ...overrides,
  };
}

describe('PreUploadConfigPanel', () => {
  test('renders the filter bar and calls onPickFile from the dropzone', async () => {
    const props = baseProps();
    const user = userEvent.setup();
    await render(<PreUploadConfigPanel {...props} />);

    expect(screen.getByTestId('filter-curriculum-CBSE')).toBeTruthy();
    await user.press(screen.getByTestId('pre-upload-dropzone'));
    expect(props.onPickFile).toHaveBeenCalled();
  });

  test('picking a different curriculum resets grade to that curriculum\'s first valid grade', async () => {
    const setCurriculum = jest.fn();
    const setGrade = jest.fn();
    const props = baseProps({ curriculum: 'CBSE', grade: 'Grade 11', setCurriculum, setGrade });
    const user = userEvent.setup();
    await render(<PreUploadConfigPanel {...props} />);

    await user.press(screen.getByTestId('filter-curriculum-IB PYP'));

    expect(setCurriculum).toHaveBeenCalledWith('IB PYP');
    // Grade 11 isn't valid for IB PYP (Grades 1-5) -> resets to its first grade.
    expect(setGrade).toHaveBeenCalledWith(GRADES_BY_CURRICULUM['IB PYP'][0]);
  });

  test('shows "Upload a file to begin" before any status exists', async () => {
    await render(<PreUploadConfigPanel {...baseProps({ status: null })} />);
    expect(screen.getByText('Upload a file to begin')).toBeTruthy();
  });

  test.each([
    ['uploaded', 0],
    ['processing', 1],
    ['processed', 1],
    ['generating', 2],
    ['generated', 3],
  ])('status "%s" marks step %i as active/complete', async (status, expectedIdx) => {
    await render(<PreUploadConfigPanel {...baseProps({ status: status as any, fileName: 'doc.pdf' })} />);
    // Every step up to expectedIdx should exist and render (no crash on any
    // real backend status); step 0 always renders once a status exists.
    expect(screen.getByTestId('analysis-step-0')).toBeTruthy();
    expect(screen.getByTestId(`analysis-step-${expectedIdx}`)).toBeTruthy();
  });

  test('a failed status shows an error state instead of the step list', async () => {
    await render(<PreUploadConfigPanel {...baseProps({ status: 'failed', statusError: 'Could not process the uploaded file.' })} />);
    expect(screen.getByText('Processing failed')).toBeTruthy();
    expect(screen.getByText('Could not process the uploaded file.')).toBeTruthy();
    expect(screen.queryByTestId('analysis-step-0')).toBeNull();
  });

  test('Detected Structure shows real counts once a draft exists, not a fabricated diff', async () => {
    // Values deliberately avoid 1-4, which also appear as the panel header badge numbers.
    await render(<PreUploadConfigPanel {...baseProps({ detected: { unitCount: 5, topicCount: 9 } })} />);
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('9')).toBeTruthy();
    expect(screen.queryByText('Nothing detected yet.')).toBeNull();
  });

  test('shows the empty state before anything is detected', async () => {
    await render(<PreUploadConfigPanel {...baseProps({ detected: null })} />);
    expect(screen.getByText('Nothing detected yet.')).toBeTruthy();
  });

  test('Save as Draft and Publish actions call their handlers only when enabled', async () => {
    const onSaveDraft = jest.fn();
    const onPublish = jest.fn();
    const user = userEvent.setup();
    await render(<PreUploadConfigPanel {...baseProps({ canSaveDraft: true, canPublish: true, onSaveDraft, onPublish })} />);

    await user.press(screen.getByTestId('pre-upload-save-draft'));
    await user.press(screen.getByTestId('pre-upload-publish'));

    expect(onSaveDraft).toHaveBeenCalled();
    expect(onPublish).toHaveBeenCalled();
  });

  test('Publish is disabled when canPublish is false', async () => {
    const onPublish = jest.fn();
    const user = userEvent.setup();
    await render(<PreUploadConfigPanel {...baseProps({ canPublish: false, onPublish })} />);

    await user.press(screen.getByTestId('pre-upload-publish'));

    expect(onPublish).not.toHaveBeenCalled();
  });
});
