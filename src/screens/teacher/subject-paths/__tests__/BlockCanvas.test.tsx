import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import BlockCanvas from '../components/BlockCanvas';

jest.mock('../components/pickLessonImage', () => ({ pickLessonImage: jest.fn() }));
jest.mock('../../../student/learning-paths/lesson-screen/components/ZoomableImage', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="zoomable" /> };
});

const colors: any = { bgDark: '#000', cardDark: '#111', borderColor: '#333', textMain: '#fff', textMuted: '#888', primary: '#fa0' };
const BLOCKS = [{ type: 'image', url: 'https://book/p1.png', caption: 'From the book, page 1.' }, { type: 'explanation', text: 'Science is a way of thinking.' }];

test('any part of the lesson, a book picture too, can be removed straight from the canvas', async () => {
  const onChange = jest.fn();
  await render(<BlockCanvas blocks={BLOCKS} colors={colors} onChange={onChange} />);
  await fireEvent.press(screen.getByTestId('block-remove-0'));
  expect(onChange).toHaveBeenCalledWith([BLOCKS[1]]);
});

test('the edit button opens a part for editing', async () => {
  await render(<BlockCanvas blocks={BLOCKS} colors={colors} onChange={jest.fn()} />);
  await fireEvent.press(screen.getByTestId('block-edit-1'));
  expect(screen.getByTestId('field-text').props.value).toBe('Science is a way of thinking.');
});
