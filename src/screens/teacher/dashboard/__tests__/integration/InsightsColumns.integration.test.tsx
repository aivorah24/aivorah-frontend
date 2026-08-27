import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import InsightsColumns from '../../components/InsightsColumns';

function tile(label: string) {
  return { icon: 'book-open', color: '#FFD700', stat: '1', label, title: label, body: 'x', screen: 'TeacherLearningPaths' };
}

describe('InsightsColumns', () => {
  test('renders all 3 column headers and every tile passed in', async () => {
    await render(
      <InsightsColumns
        gold="#FFD700"
        learningPathTiles={[tile('Struggling')]}
        assignmentTiles={[tile('Pending')]}
        challengeTiles={[tile('Attempted')]}
        onTilePress={jest.fn()}
        styles={{}}
      />
    );
    expect(screen.getByText('Learning Path')).toBeTruthy();
    expect(screen.getByText('Assignments')).toBeTruthy();
    expect(screen.getByText('Challenges')).toBeTruthy();
    expect(screen.getByText('Struggling')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
    expect(screen.getByText('Attempted')).toBeTruthy();
  });

  test('pressing a Learning Path tile calls onTilePress with its own index (0-based)', async () => {
    const user = userEvent.setup();
    const onTilePress = jest.fn();
    await render(
      <InsightsColumns
        gold="#FFD700"
        learningPathTiles={[tile('A'), tile('B')]}
        assignmentTiles={[tile('C')]}
        challengeTiles={[tile('D')]}
        onTilePress={onTilePress}
        styles={{}}
      />
    );

    await user.press(screen.getByText('B'));

    expect(onTilePress).toHaveBeenCalledWith(1);
  });

  test('pressing an Assignments tile offsets the index past all Learning Path tiles', async () => {
    const user = userEvent.setup();
    const onTilePress = jest.fn();
    await render(
      <InsightsColumns
        gold="#FFD700"
        learningPathTiles={[tile('A'), tile('B')]}
        assignmentTiles={[tile('C')]}
        challengeTiles={[tile('D')]}
        onTilePress={onTilePress}
        styles={{}}
      />
    );

    await user.press(screen.getByText('C'));

    expect(onTilePress).toHaveBeenCalledWith(2); // 2 learning-path tiles before it
  });

  test('pressing a Challenges tile offsets the index past both Learning Path and Assignments tiles', async () => {
    const user = userEvent.setup();
    const onTilePress = jest.fn();
    await render(
      <InsightsColumns
        gold="#FFD700"
        learningPathTiles={[tile('A'), tile('B')]}
        assignmentTiles={[tile('C')]}
        challengeTiles={[tile('D')]}
        onTilePress={onTilePress}
        styles={{}}
      />
    );

    await user.press(screen.getByText('D'));

    expect(onTilePress).toHaveBeenCalledWith(3); // 2 + 1 before it
  });
});
