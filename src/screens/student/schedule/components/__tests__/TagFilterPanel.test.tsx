import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import TagFilterPanel from '../TagFilterPanel';
import { ASSIGNMENT_TAGS, EVENT_TAGS } from '../../constants';

const colors = { accentYellow: '#fa0', textDim: '#666', textHeading: '#fff', textMain: '#fff' } as any;

function baseProps(overrides: Partial<React.ComponentProps<typeof TagFilterPanel>> = {}) {
  return {
    showTagPanel: true, setShowTagPanel: jest.fn(),
    enabledAssignmentTags: new Set(ASSIGNMENT_TAGS.map(t => t.key)),
    enabledEventTags: new Set(EVENT_TAGS.map(t => t.key)),
    allAssignmentOn: true, allEventOn: true,
    toggleAssignmentTag: jest.fn(), toggleEventTag: jest.fn(),
    toggleAllAssignment: jest.fn(), toggleAllEvent: jest.fn(),
    styles: {}, colors,
    ...overrides,
  } as React.ComponentProps<typeof TagFilterPanel>;
}

describe('TagFilterPanel', () => {
  test('collapsed (showTagPanel: false) hides the individual tag checkboxes', async () => {
    await render(<TagFilterPanel {...baseProps({ showTagPanel: false })} />);
    expect(screen.queryByTestId(`schedule-tag-filter-${ASSIGNMENT_TAGS[0].key}`)).toBeNull();
  });

  test('expanded shows every real assignment and event tag', async () => {
    await render(<TagFilterPanel {...baseProps()} />);
    ASSIGNMENT_TAGS.forEach(t => expect(screen.getByTestId(`schedule-tag-filter-${t.key}`)).toBeTruthy());
    EVENT_TAGS.forEach(t => expect(screen.getByTestId(`schedule-tag-filter-${t.key}`)).toBeTruthy());
  });

  test('pressing the header toggles showTagPanel', async () => {
    const setShowTagPanel = jest.fn();
    const user = userEvent.setup();
    await render(<TagFilterPanel {...baseProps({ setShowTagPanel })} />);

    await user.press(screen.getByTestId('schedule-tag-filters-toggle'));

    expect(setShowTagPanel).toHaveBeenCalledWith(false);
  });

  test('pressing a specific assignment tag calls toggleAssignmentTag with its real key', async () => {
    const toggleAssignmentTag = jest.fn();
    const user = userEvent.setup();
    await render(<TagFilterPanel {...baseProps({ toggleAssignmentTag })} />);

    await user.press(screen.getByTestId(`schedule-tag-filter-${ASSIGNMENT_TAGS[0].key}`));

    expect(toggleAssignmentTag).toHaveBeenCalledWith(ASSIGNMENT_TAGS[0].key);
  });

  test('pressing a specific event tag calls toggleEventTag with its real key', async () => {
    const toggleEventTag = jest.fn();
    const user = userEvent.setup();
    await render(<TagFilterPanel {...baseProps({ toggleEventTag })} />);

    await user.press(screen.getByTestId(`schedule-tag-filter-${EVENT_TAGS[0].key}`));

    expect(toggleEventTag).toHaveBeenCalledWith(EVENT_TAGS[0].key);
  });

  test('a checked tag reflects its real checked accessibility state', async () => {
    await render(<TagFilterPanel {...baseProps({ enabledAssignmentTags: new Set() })} />);
    expect(screen.getByTestId(`schedule-tag-filter-${ASSIGNMENT_TAGS[0].key}`).props.accessibilityState.checked).toBe(false);
  });
});
