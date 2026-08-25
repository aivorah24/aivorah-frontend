// Integration test: useTagFilters hook wired to the real TagFilterPanel
// component (as TeacherScheduleScreen wires them), verifying press
// interactions on the real component flow through to real hook state.
import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import TagFilterPanel from '../../components/TagFilterPanel';
import { useTagFilters } from '../../hooks/useTagFilters';
import { makeStyles } from '../../styles';
import { darkColors } from '../../../../../theme';
import { ASSIGNMENT_TAGS, EVENT_TAGS } from '../../constants';

function Harness() {
  const h = useTagFilters({}, []);
  const styles = makeStyles(darkColors as any);
  return (
    <TagFilterPanel
      colors={darkColors as any}
      gold={darkColors.accentYellow}
      styles={styles}
      showTagPanel={h.showTagPanel}
      setShowTagPanel={h.setShowTagPanel}
      enabledAssignmentTags={h.enabledAssignmentTags}
      enabledEventTags={h.enabledEventTags}
      allAssignmentOn={h.allAssignmentOn}
      allEventOn={h.allEventOn}
      toggleAssignmentTag={h.toggleAssignmentTag}
      toggleEventTag={h.toggleEventTag}
      toggleAllAssignment={h.toggleAllAssignment}
      toggleAllEvent={h.toggleAllEvent}
    />
  );
}

describe('TagFilterPanel + useTagFilters integration', () => {
  test('panel starts collapsed; toggling the header expands it and shows both tag groups', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    expect(screen.queryByText('ASSIGNMENT TAGS')).toBeNull();
    await user.press(screen.getByTestId('teacher-schedule-tag-filters-toggle'));
    expect(screen.getByText('ASSIGNMENT TAGS')).toBeTruthy();
    expect(screen.getByText('EVENT TAGS')).toBeTruthy();
    // Every assignment + event tag key renders as a row label.
    for (const t of ASSIGNMENT_TAGS) expect(screen.getByText(t.key)).toBeTruthy();
    for (const t of EVENT_TAGS) expect(screen.getByText(t.key)).toBeTruthy();
  });

  test('pressing a single assignment tag row toggles it off (unchecked style) via real hook state', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('teacher-schedule-tag-filters-toggle'));

    const key = ASSIGNMENT_TAGS[0].key;
    const before = screen.getAllByTestId(`teacher-schedule-tag-filter-${key}`)[0];
    await user.press(before);

    // Re-query after state update; box style flips to transparent/unchecked.
    const after = screen.getAllByTestId(`teacher-schedule-tag-filter-${key}`)[0];
    const checkboxView = (after.children as any[]).find((c: any) => typeof c !== 'string');
    expect(checkboxView.props.style.backgroundColor).toBe('transparent');
  });

  test('the "ASSIGNMENT TAGS" select-all row unchecks all rows when toggled off', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('teacher-schedule-tag-filters-toggle'));
    await user.press(screen.getByText('ASSIGNMENT TAGS'));

    for (const t of ASSIGNMENT_TAGS) {
      const row = screen.getAllByTestId(`teacher-schedule-tag-filter-${t.key}`)[0];
      const checkboxView = (row.children as any[]).find((c: any) => typeof c !== 'string');
      expect(checkboxView.props.style.backgroundColor).toBe('transparent');
    }
  });

  test('pressing a single event tag row toggles it off (unchecked style) via real hook state', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('teacher-schedule-tag-filters-toggle'));

    const key = EVENT_TAGS[0].key;
    const before = screen.getAllByTestId(`teacher-schedule-tag-filter-${key}`);
    // Event tag rows share the same testID prefix as assignment rows only if
    // keys collide; ALL_TAGS keys are distinct, so there's exactly one match
    // per group other than shared prefix collisions — assert on the last
    // match (event tag section renders after assignment tags).
    const target = before[before.length - 1];
    await user.press(target);

    const after = screen.getAllByTestId(`teacher-schedule-tag-filter-${key}`);
    const afterTarget = after[after.length - 1];
    const checkboxView = (afterTarget.children as any[]).find((c: any) => typeof c !== 'string');
    expect(checkboxView.props.style.backgroundColor).toBe('transparent');
  });

  test('the "EVENT TAGS" select-all row unchecks all event rows when toggled off', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('teacher-schedule-tag-filters-toggle'));
    await user.press(screen.getByText('EVENT TAGS'));

    for (const t of EVENT_TAGS) {
      const rows = screen.getAllByTestId(`teacher-schedule-tag-filter-${t.key}`);
      const row = rows[rows.length - 1];
      const checkboxView = (row.children as any[]).find((c: any) => typeof c !== 'string');
      expect(checkboxView.props.style.backgroundColor).toBe('transparent');
    }
  });

  test('collapsing the panel again hides both tag groups', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('teacher-schedule-tag-filters-toggle'));
    expect(screen.getByText('ASSIGNMENT TAGS')).toBeTruthy();
    await user.press(screen.getByTestId('teacher-schedule-tag-filters-toggle'));
    expect(screen.queryByText('ASSIGNMENT TAGS')).toBeNull();
  });
});
