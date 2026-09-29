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

  const stepCount = () => [0, 1, 2, 3, 4].filter((i) => screen.queryByTestId(`analysis-step-${i}`)).length;

  test('uploading phase shows the file chip with "Uploading…" and step 1 active', async () => {
    await render(<PreUploadConfigPanel {...baseProps({ phase: 'uploading', fileName: 'doc.pdf' })} />);
    expect(screen.getByTestId('pre-upload-file-chip')).toBeTruthy();
    expect(screen.getByTestId('upload-state')).toBeTruthy();
    expect(screen.getByText('Uploading file…')).toBeTruthy();
    expect(screen.queryByText('Upload a file to begin')).toBeNull();
  });

  test.each([
    ['extracting', 'Extracting content'],
    ['analysing', 'Analysing curriculum'],
    ['generating', 'Generating learning path'],
    ['saving', 'Saving results'],
  ])('progress stage "%s" renders all steps from real data', async (stage, label) => {
    await render(<PreUploadConfigPanel {...baseProps({
      phase: 'tracking', status: 'processing', fileName: 'doc.pdf',
      progress: { stage, topicsDone: null, topicsTotal: null, updatedAt: 'x' },
    })} />);
    expect(stepCount()).toBe(5);
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText('File uploaded')).toBeTruthy();
  });

  test('falls back to curriculum status when progress is null', async () => {
    await render(<PreUploadConfigPanel {...baseProps({ phase: 'tracking', status: 'generating', fileName: 'doc.pdf' })} />);
    expect(stepCount()).toBe(5);
  });

  test('generating stage shows real "topic X of Y"', async () => {
    await render(<PreUploadConfigPanel {...baseProps({
      phase: 'tracking', status: 'generating', fileName: 'doc.pdf',
      progress: { stage: 'generating', topicsDone: 3, topicsTotal: 12, updatedAt: 'x' },
    })} />);
    expect(screen.getByText('Generating learning path — topic 3 of 12')).toBeTruthy();
  });

  test('shows the connection-issue note', async () => {
    await render(<PreUploadConfigPanel {...baseProps({ phase: 'tracking', status: 'processing', fileName: 'd.pdf', connectionIssue: true })} />);
    expect(screen.getByTestId('connection-issue')).toBeTruthy();
  });

  test('a failed status shows the error and a Retry button instead of the step list', async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();
    await render(<PreUploadConfigPanel {...baseProps({ status: 'failed', phase: 'tracking', statusError: 'Could not process the uploaded file.', onRetry })} />);
    expect(screen.getByText('Processing failed')).toBeTruthy();
    expect(screen.getAllByText('Could not process the uploaded file.').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('analysis-step-0')).toBeNull();
    await user.press(screen.getByTestId('retry-button'));
    expect(onRetry).toHaveBeenCalled();
  });

  test('a failed upload POST shows the error and Retry', async () => {
    await render(<PreUploadConfigPanel {...baseProps({ phase: 'upload_failed', fileName: 'd.pdf', statusError: 'boom', onRetry: jest.fn() })} />);
    expect(screen.getByText('Upload failed')).toBeTruthy();
    expect(screen.getByTestId('retry-button')).toBeTruthy();
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

  test('once the path is ready, "Review & publish in Learning Paths" opens it', async () => {
    const onOpenReview = jest.fn();
    const user = userEvent.setup();
    await render(<PreUploadConfigPanel {...baseProps({ onOpenReview })} />);

    expect(screen.getByText('Your learning path is ready')).toBeTruthy();
    await user.press(screen.getByTestId('pre-upload-open-review'));
    expect(onOpenReview).toHaveBeenCalled();
  });

  test('before that, the review button is disabled and there is no save/publish here', async () => {
    await render(<PreUploadConfigPanel {...baseProps()} />);
    expect(screen.getByText('Available when processing finishes')).toBeTruthy();
    expect(screen.queryByTestId('pre-upload-save-draft')).toBeNull();
    expect(screen.queryByTestId('pre-upload-publish')).toBeNull();
  });
});
