import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import VisualBlockEditor from '../components/VisualBlockEditor';

const colors: any = { bgDark: '#000', cardDark: '#111', borderColor: '#333', textMain: '#fff', textMuted: '#888', primary: '#fa0' };

async function setup(block: any) {
  const onChange = jest.fn();
  await render(<VisualBlockEditor block={block} colors={colors} onChange={onChange} />);
  return { onChange };
}

const COMPARE = {
  type: 'visual',
  visual: { kind: 'compare', title: 'Daily Life Scientists', columns: [
    { label: 'Cook', points: ['Observes dal spilling', 'Wonders if there was too much water'] },
    { label: 'Electrician', points: ['Observes light not working'] },
  ] },
};

test('columns are edited in place: heading, points, add a point, add a column', async () => {
  const { onChange } = await setup(COMPARE);
  expect(screen.getByTestId('vcol-label-0').props.value).toBe('Cook');

  await fireEvent.changeText(screen.getByTestId('vcol-point-1-0'), 'Sees the light is off');
  expect(onChange.mock.calls[0][0].visual.columns[1].points).toEqual(['Sees the light is off']);

  await fireEvent.press(screen.getByTestId('vcol-point-add-1'));
  expect(onChange.mock.calls[1][0].visual.columns[1].points).toEqual(['Observes light not working', '']);

  await fireEvent.press(screen.getByTestId('vcol-add'));
  expect(onChange.mock.calls[2][0].visual.columns).toHaveLength(3);
  expect(onChange.mock.calls[2][0].visual.title).toBe('Daily Life Scientists');
});

test('a table is a grid: type in cells, add and remove rows and columns', async () => {
  const table = { type: 'table', caption: 'Place value', headers: ['Number', 'Tens'], rows: [['23', '2'], ['47', '4']] };
  const { onChange } = await setup(table);

  await fireEvent.changeText(screen.getByTestId('vtable-c-1-1'), 'four');
  expect(onChange.mock.calls[0][0].rows).toEqual([['23', '2'], ['47', 'four']]);

  await fireEvent.press(screen.getByTestId('vtable-col-add'));
  expect(onChange.mock.calls[1][0]).toEqual(expect.objectContaining({ headers: ['Number', 'Tens', ''], rows: [['23', '2', ''], ['47', '4', '']] }));

  await fireEvent.press(screen.getByTestId('vtable-row-add'));
  expect(onChange.mock.calls[2][0].rows).toEqual([['23', '2'], ['47', '4'], ['', '']]);

  await fireEvent.press(screen.getByTestId('vtable-row-remove-0'));
  expect(onChange.mock.calls[3][0].rows).toEqual([['47', '4']]);

  await fireEvent.press(screen.getByTestId('vtable-col-left-1'));
  expect(onChange.mock.calls[4][0]).toEqual(expect.objectContaining({ headers: ['Tens', 'Number'], rows: [['2', '23'], ['4', '47']] }));
});

test('flow steps keep their order and can grow', async () => {
  const { onChange } = await setup({ type: 'process', title: 'Scientific method', steps: ['Observe', 'Ask'] });
  await fireEvent.press(screen.getByTestId('vflow-add'));
  expect(onChange.mock.calls[0][0].steps).toEqual(['Observe', 'Ask', '']);
});

