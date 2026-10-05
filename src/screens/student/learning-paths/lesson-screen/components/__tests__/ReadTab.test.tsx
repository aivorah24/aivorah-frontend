// Unit tests for ReadTab.tsx's two things this pilot touched:
// 1. AI enrichment blocks (when present) replace the plain LessonRenderer
//    body — mutually exclusive, never both.
// 2. The "Try this yourself" box no longer renders empty (see
//    BUGS_AND_FIXES.md — reported directly from a screenshot of this exact
//    blank-box state).

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ReadTab from '../ReadTab';
import { makeStyles } from '../../styles';

const colors: any = {
  textMain: '#111', textMuted: '#666', primary: '#C9A24E', accentGreen: '#7E9A86',
  borderColor: '#ddd', cardDark: '#fafafa', bgDark: '#fff',
};
const styles = makeStyles(colors);

function baseTopic(overrides: any = {}) {
  return {
    name: 'Relevance of Information',
    readText: { intro: 'raw intro', keyLearnings: [], body: [], activity: '', vocab: [], ...overrides },
  };
}

const noop = () => {};

describe('ReadTab', () => {
  test('AI enrichment blocks present -> renders LearningBlocks content, not the raw intro paragraph', async () => {
    await render(
      <ReadTab
        topic={baseTopic()}
        rawPayload={{
          whatYoullLearn: ['What relevant information means'],
          blocks: [{ type: 'explanation', text: 'Simplified, student-friendly explanation.' }],
        }}
        grade="Grade 11" subject="Accountancy" colors={colors} styles={styles}
        onZoomImage={noop} onReadFullBook={noop}
      />
    );
    expect(screen.getByText('Simplified, student-friendly explanation.')).toBeTruthy();
    expect(screen.getByText("WHAT YOU'LL LEARN")).toBeTruthy();
  });

  test('no AI enrichment blocks -> falls back to the existing LessonRenderer path, unaffected by this pilot', async () => {
    await render(
      <ReadTab
        topic={baseTopic()}
        rawPayload={{ intro: 'raw intro text', body: [] }}
        grade="Grade 9" subject="English" colors={colors} styles={styles}
        onZoomImage={noop} onReadFullBook={noop}
      />
    );
    expect(screen.queryByText("WHAT YOU'LL LEARN")).toBeNull();
  });

  test('empty activity text -> no "Try this yourself" box at all (the reported bug)', async () => {
    await render(
      <ReadTab
        topic={baseTopic({ activity: '' })}
        rawPayload={{ intro: 'x', body: [] }}
        grade="Grade 11" subject="Accountancy" colors={colors} styles={styles}
        onZoomImage={noop} onReadFullBook={noop}
      />
    );
    expect(screen.queryByText('Try this yourself')).toBeNull();
  });

  test('real activity text -> the box renders with that text', async () => {
    await render(
      <ReadTab
        topic={baseTopic({ activity: 'List three examples of relevant information at your school.' })}
        rawPayload={{ intro: 'x', body: [] }}
        grade="Grade 11" subject="Accountancy" colors={colors} styles={styles}
        onZoomImage={noop} onReadFullBook={noop}
      />
    );
    expect(screen.getByText('Try this yourself')).toBeTruthy();
    expect(screen.getByText('List three examples of relevant information at your school.')).toBeTruthy();
  });

  test('an AI-generated "activity" block suppresses the separate old activity box, avoiding a duplicate', async () => {
    await render(
      <ReadTab
        topic={baseTopic({ activity: 'Old-path activity text.' })}
        rawPayload={{
          whatYoullLearn: ['x'],
          blocks: [{ type: 'activity', text: 'AI-generated try-this-yourself.' }],
        }}
        grade="Grade 11" subject="Accountancy" colors={colors} styles={styles}
        onZoomImage={noop} onReadFullBook={noop}
      />
    );
    expect(screen.getByText('AI-generated try-this-yourself.')).toBeTruthy();
    expect(screen.queryByText('Old-path activity text.')).toBeNull();
  });

  test('scrolling to the end of Learn reports that the topic has been read', async () => {
    const { fireEvent } = require('@testing-library/react-native');
    const onReachedEnd = jest.fn();
    await render(
      <ReadTab topic={baseTopic({ intro: 'A long lesson.' })} rawPayload={null} grade="Grade 7" subject="Science"
        colors={colors} styles={styles} onZoomImage={noop} onReadFullBook={noop} onReachedEnd={onReachedEnd} />
    );
    const scroller = screen.getByTestId('learn-scroll');
    fireEvent.scroll(scroller, { nativeEvent: { contentOffset: { y: 100 }, contentSize: { height: 2000 }, layoutMeasurement: { height: 600 } } });
    expect(onReachedEnd).not.toHaveBeenCalled();
    fireEvent.scroll(scroller, { nativeEvent: { contentOffset: { y: 1390 }, contentSize: { height: 2000 }, layoutMeasurement: { height: 600 } } });
    expect(onReachedEnd).toHaveBeenCalled();
  });
});
