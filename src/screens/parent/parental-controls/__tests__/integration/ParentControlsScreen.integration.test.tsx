import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react-native';
import ParentControlsScreen from '../../ParentControlsScreen';

jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'parent@example.com', name: 'Jane Doe', uid: '123' }, role: 'parent' }),
  getPendingReturnRole: () => null,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: jest.fn(),
  useRoute: () => ({ name: 'ParentControls' }),
}));

// Window width drives the Screen Time grid (2 columns at >= 1100). Default to a phone width.
let mockWindowWidth = 390;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWindowWidth, height: 900, scale: 1, fontScale: 1 }),
}));

import * as parentControlsService from '../../services/parentControlsService';

jest.mock('../../services/parentControlsService', () => ({
  fetchChildren: jest.fn(),
  fetchScreenTime: jest.fn(),
  saveScreenTime: jest.fn(),
}));

const CHILD = { id: 'c1', name: 'Kiddo', email: 'kiddo@test.com', grade: 'Grade 4', curriculum: 'IB PYP', studyTimeMinutes: 0 };

// Subject Filter reads the child's list from learning-paths-service (/curriculum/subjects), like My Learning Journey.
const SUBJECTS_BY_CURRICULUM: Record<string, string[]> = {
  CBSE: ['English', 'Mathematics', 'Science', 'Social Science', 'Hindi', 'Arts', 'Physical Education and Well Being'],
  'IB PYP': ['Mathematics', 'Language', 'Science', 'Social Studies'],
  'IB DP': ['Mathematics: Analysis and Approaches', 'Physics', 'English A: Language and Literature'],
};
beforeEach(() => {
  global.fetch = jest.fn((url: string) => {
    const curriculum = decodeURIComponent(String(url).match(/curriculum=([^&]*)/)?.[1] ?? '');
    const list = SUBJECTS_BY_CURRICULUM[curriculum] ?? [];
    return Promise.resolve({ json: async () => ({ subjects: list.map(subject => ({ subject, topicCount: 1, topics: [] })) }) });
  }) as any;
});

const renderScreen = async () => {
  return await render(<ParentControlsScreen navigation={{ navigate: jest.fn() }} />);
};

describe('ParentControlsScreen Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the empty-children state when the parent has no linked kids', async () => {
    (parentControlsService.fetchChildren as jest.Mock).mockResolvedValue([]);

    await renderScreen();

    await waitFor(() => expect(parentControlsService.fetchChildren).toHaveBeenCalledWith('parent@example.com'));
    expect(await screen.findByText('No children linked yet. Add a child from the dashboard to manage controls.')).toBeTruthy();
  });

  it('auto-selects the first child and renders its saved controls', async () => {
    (parentControlsService.fetchChildren as jest.Mock).mockResolvedValue([CHILD]);
    (parentControlsService.fetchScreenTime as jest.Mock).mockResolvedValue({
      isEnabled: true, dailyLimitMinutes: 90, lockWhenReached: true,
    });

    await renderScreen();

    await waitFor(() => expect(parentControlsService.fetchScreenTime).toHaveBeenCalledWith('parent@example.com', 'c1'));
    expect(await screen.findByText('USAGE OVERVIEW — KIDDO')).toBeTruthy();
    expect(await screen.findByText('Lock app when limit is reached')).toBeTruthy();
  });

  it('toggling Daily Limit and saving persists the change', async () => {
    (parentControlsService.fetchChildren as jest.Mock).mockResolvedValue([CHILD]);
    (parentControlsService.fetchScreenTime as jest.Mock).mockResolvedValue({ isEnabled: false });
    (parentControlsService.saveScreenTime as jest.Mock).mockResolvedValue({ success: true });

    await renderScreen();
    await waitFor(() => expect(parentControlsService.fetchScreenTime).toHaveBeenCalled());

    const dailyLimitSwitch = await screen.findByTestId('parental-controls-daily-limit-switch');
    await act(async () => {
      fireEvent(dailyLimitSwitch, 'valueChange', true);
    });

    const saveBtn = await screen.findByText('Save All Settings');
    await act(async () => {
      fireEvent.press(saveBtn);
    });

    await waitFor(() => {
      expect(parentControlsService.saveScreenTime).toHaveBeenCalledWith(
        'parent@example.com', 'c1', expect.objectContaining({ isEnabled: true }),
      );
    });
  });

  it('blocking a subject via Subject Filter shows the blocked count', async () => {
    (parentControlsService.fetchChildren as jest.Mock).mockResolvedValue([CHILD]);
    (parentControlsService.fetchScreenTime as jest.Mock).mockResolvedValue({ subjectFilterEnabled: true, blockedSubjects: [] });
    (parentControlsService.saveScreenTime as jest.Mock).mockResolvedValue({ success: true });

    await renderScreen();
    await waitFor(() => expect(parentControlsService.fetchScreenTime).toHaveBeenCalled());

    const mathsChip = await screen.findByText('Mathematics');
    await act(async () => {
      fireEvent.press(mathsChip);
    });

    expect(await screen.findByText('1 subject blocked')).toBeTruthy();
  });

  it('changes the Daily Limit via the picker modal', async () => {
    (parentControlsService.fetchChildren as jest.Mock).mockResolvedValue([CHILD]);
    (parentControlsService.fetchScreenTime as jest.Mock).mockResolvedValue({ isEnabled: true, dailyLimitMinutes: 60 });
    (parentControlsService.saveScreenTime as jest.Mock).mockResolvedValue({ success: true });

    await renderScreen();
    await waitFor(() => expect(parentControlsService.fetchScreenTime).toHaveBeenCalled());

    const limitBtn = await screen.findByText('1h');
    await act(async () => {
      fireEvent.press(limitBtn);
    });

    const option = await screen.findByText('1h 30m');
    await act(async () => {
      fireEvent.press(option);
    });

    // Modal closes and the row now shows the newly selected limit.
    expect(screen.queryByTestId('picker-modal-close')).toBeNull();
    expect(await screen.findByText('1h 30m')).toBeTruthy();
  });

  it('switching between multiple linked children reloads that child\'s controls', async () => {
    const child2 = { id: 'c2', name: 'Second Kid', email: 'second@test.com', grade: 'Grade 6', studyTimeMinutes: 0 };
    (parentControlsService.fetchChildren as jest.Mock).mockResolvedValue([CHILD, child2]);
    (parentControlsService.fetchScreenTime as jest.Mock)
      .mockResolvedValueOnce({ isEnabled: true, dailyLimitMinutes: 45 })
      .mockResolvedValueOnce({ isEnabled: false });

    await renderScreen();
    await waitFor(() => expect(screen.getByText('USAGE OVERVIEW — KIDDO')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText('Second Kid'));
    });

    await waitFor(() => {
      expect(parentControlsService.fetchScreenTime).toHaveBeenCalledWith('parent@example.com', 'c2');
    });
    expect(await screen.findByText('USAGE OVERVIEW — SECOND KID')).toBeTruthy();
  });
});

describe('ParentControlsScreen — Subject Filter uses the child\'s real subjects', () => {
  beforeEach(() => jest.clearAllMocks());

  const CBSE_KID = { id: 'c1', name: 'Asha', email: 'a@t.com', grade: 'Grade 8', curriculum: 'CBSE', profileGrade: 'Grade 8', profileCurriculum: 'CBSE', studyTimeMinutes: 0 };
  const IB_KID = { id: 'c2', name: 'Ben', email: 'b@t.com', grade: 'Grade 11', curriculum: 'IB DP', profileGrade: 'Grade 11', profileCurriculum: 'IB DP', studyTimeMinutes: 0 };

  it('a CBSE Grade 8 child gets the CBSE subjects, not the old static list', async () => {
    (parentControlsService.fetchChildren as jest.Mock).mockResolvedValue([CBSE_KID]);
    (parentControlsService.fetchScreenTime as jest.Mock).mockResolvedValue({ subjectFilterEnabled: true, blockedSubjects: [] });

    await renderScreen();

    for (const name of SUBJECTS_BY_CURRICULUM.CBSE) expect(await screen.findByText(name)).toBeTruthy();
    expect(screen.queryByText('Social Studies')).toBeNull();
    expect(screen.queryByText('Physical Education')).toBeNull();
  });

  it('switching to an IB child refreshes the list to their IB subjects', async () => {
    (parentControlsService.fetchChildren as jest.Mock).mockResolvedValue([CBSE_KID, IB_KID]);
    (parentControlsService.fetchScreenTime as jest.Mock).mockResolvedValue({ subjectFilterEnabled: true, blockedSubjects: [] });

    await renderScreen();
    expect(await screen.findByText('Social Science')).toBeTruthy();

    await act(async () => { fireEvent.press(screen.getByText('Ben')); });

    expect(await screen.findByText('Physics')).toBeTruthy();
    expect(screen.queryByText('Social Science')).toBeNull();
  });

  it('a child with no curriculum on their profile sees a message instead of a list', async () => {
    (parentControlsService.fetchChildren as jest.Mock).mockResolvedValue([{ ...CBSE_KID, curriculum: 'IB PYP', profileCurriculum: '' }]);
    (parentControlsService.fetchScreenTime as jest.Mock).mockResolvedValue({ subjectFilterEnabled: true, blockedSubjects: [] });

    await renderScreen();

    expect(await screen.findByTestId('parental-controls-subjects-notice')).toBeTruthy();
    expect(screen.getByText(/Asha's curriculum or grade isn't set/)).toBeTruthy();
    expect(screen.queryByText('Mathematics')).toBeNull();
  });

  it('saved blocks still in the list show; ones not in the list are hidden but kept on save', async () => {
    (parentControlsService.fetchChildren as jest.Mock).mockResolvedValue([CBSE_KID]);
    (parentControlsService.fetchScreenTime as jest.Mock).mockResolvedValue({ subjectFilterEnabled: true, blockedSubjects: ['Mathematics', 'Social Studies'] });
    (parentControlsService.saveScreenTime as jest.Mock).mockResolvedValue({ success: true });

    await renderScreen();

    expect(await screen.findByText('1 subject blocked')).toBeTruthy();
    expect(screen.queryByText('Social Studies')).toBeNull();

    await act(async () => { fireEvent.press(screen.getByText('Social Science')); });
    expect(await screen.findByText('2 subjects blocked')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByText('Save All Settings')); });

    await waitFor(() => expect(parentControlsService.saveScreenTime).toHaveBeenCalledWith(
      'parent@example.com', 'c1', expect.objectContaining({ blockedSubjects: ['Mathematics', 'Social Studies', 'Social Science'], dailyLimitMinutes: 90 }),
    ));
  });
});

describe('ParentControlsScreen — server failures are visible (parental controls RCA)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('a failed Save shows an on-screen error (Alert.alert is a no-op on web)', async () => {
    (parentControlsService.fetchChildren as jest.Mock).mockResolvedValue([CHILD]);
    (parentControlsService.fetchScreenTime as jest.Mock).mockResolvedValue({ isEnabled: false });
    (parentControlsService.saveScreenTime as jest.Mock).mockResolvedValue({ success: false, error: "Couldn't reach parental controls. Please try again." });

    await renderScreen();
    await waitFor(() => expect(parentControlsService.fetchScreenTime).toHaveBeenCalled());

    await act(async () => { fireEvent.press(await screen.findByText('Save All Settings')); });

    expect(await screen.findByTestId('parental-controls-error')).toBeTruthy();
    expect(screen.getByText("Couldn't reach parental controls. Please try again.")).toBeTruthy();
  });

  it('a failed initial load shows an error instead of silently showing defaults as real settings', async () => {
    (parentControlsService.fetchChildren as jest.Mock).mockResolvedValue([CHILD]);
    (parentControlsService.fetchScreenTime as jest.Mock).mockRejectedValue(new Error('GET screen-time -> 404'));

    await renderScreen();

    expect(await screen.findByTestId('parental-controls-error')).toBeTruthy();
    expect(screen.getByText(/couldn't load/i)).toBeTruthy();
  });

  it('a successful save clears a previous error', async () => {
    (parentControlsService.fetchChildren as jest.Mock).mockResolvedValue([CHILD]);
    (parentControlsService.fetchScreenTime as jest.Mock).mockResolvedValue({ isEnabled: false });
    (parentControlsService.saveScreenTime as jest.Mock)
      .mockResolvedValueOnce({ success: false, error: 'boom' })
      .mockResolvedValueOnce({ success: true });

    await renderScreen();
    await waitFor(() => expect(parentControlsService.fetchScreenTime).toHaveBeenCalled());
    const save = await screen.findByText('Save All Settings');

    await act(async () => { fireEvent.press(save); });
    expect(await screen.findByText('boom')).toBeTruthy();

    await act(async () => { fireEvent.press(screen.getByText('Save All Settings')); });
    await waitFor(() => expect(screen.queryByTestId('parental-controls-error')).toBeNull());
  });
});

describe('ParentControlsScreen — Screen Time grid layout', () => {
  const SCREEN_TIME_SWITCHES = [
    'parental-controls-daily-limit-switch',
    'parental-controls-weekly-cap-switch',
    'parental-controls-allowed-hours-switch',
    'parental-controls-break-enforcer-switch',
  ];

  const renderWithWidth = async (width: number) => {
    mockWindowWidth = width;
    (parentControlsService.fetchChildren as jest.Mock).mockResolvedValue([CHILD]);
    (parentControlsService.fetchScreenTime as jest.Mock).mockResolvedValue({ isEnabled: true, subjectFilterEnabled: true });
    await renderScreen();
    return screen.findByTestId('parental-controls-screen-time-grid');
  };

  // The direct wrappers around each Screen Time card (the grid cells).
  const cellsOf = (grid: any) => grid.children.filter((c: any) => typeof c !== 'string');

  beforeEach(() => jest.clearAllMocks());
  afterAll(() => { mockWindowWidth = 390; });

  it('wide screens lay the four Screen Time cards out in 2 columns that keep their own height', async () => {
    const grid = await renderWithWidth(1280);
    const gridStyle = StyleSheet.flatten(grid.props.style);
    expect(gridStyle).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' });

    const cells = cellsOf(grid);
    expect(cells).toHaveLength(4);
    cells.forEach((cell: any) => {
      const cellStyle = StyleSheet.flatten(cell.props.style);
      expect(cellStyle).toMatchObject({ flexBasis: '48%', flexGrow: 1 });
      expect(cellStyle.alignSelf).toBeUndefined();
      expect(cellStyle.height).toBeUndefined();
    });
    SCREEN_TIME_SWITCHES.forEach(id => expect(within(grid).getByTestId(id)).toBeTruthy());
  });

  it('mobile widths stack the cards in a single column', async () => {
    const grid = await renderWithWidth(390);
    const gridStyle = StyleSheet.flatten(grid.props.style);
    expect(gridStyle.flexDirection).not.toBe('row');
    expect(gridStyle.flexWrap).toBeUndefined();
    cellsOf(grid).forEach((cell: any) => expect(StyleSheet.flatten(cell.props.style) ?? {}).not.toHaveProperty('flexBasis'));
  });

  it('just below the breakpoint (1099) is still a single column', async () => {
    const grid = await renderWithWidth(1099);
    expect(StyleSheet.flatten(grid.props.style).flexDirection).not.toBe('row');
  });

  it('Subject Filter stays outside the grid, full width below it, on wide screens', async () => {
    const grid = await renderWithWidth(1280);
    expect(within(grid).queryByTestId('parental-controls-subject-filter-switch')).toBeNull();
    expect(within(grid).queryByText('Subject Filter')).toBeNull();
    expect(await screen.findByTestId('parental-controls-subject-filter-switch')).toBeTruthy();
    expect(await screen.findByText('Mathematics')).toBeTruthy();
  });
});
