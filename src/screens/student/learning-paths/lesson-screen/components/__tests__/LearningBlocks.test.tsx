// Unit tests for the AI enrichment pilot's structured-content renderer (see
// aivorah-learning-paths-service's services/curriculum/blockSchema.js for
// the matching server-side validator this frontend switch mirrors).

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import LearningBlocks from '../LearningBlocks';

const colors: any = {
  textMain: '#111', textMuted: '#666', primary: '#C9A24E', accentGreen: '#7E9A86', borderColor: '#ddd', cardDark: '#fafafa',
};

describe('LearningBlocks', () => {
  test('renders "What you\'ll learn" and an explanation block', async () => {
    await render(
      <LearningBlocks
        whatYoullLearn={['What relevant information means']}
        blocks={[{ type: 'explanation', text: 'Information is relevant if it can change a decision.' }]}
        colors={colors}
      />
    );
    expect(screen.getByText("WHAT YOU'LL LEARN")).toBeTruthy();
    expect(screen.getByText('What relevant information means', { exact: false })).toBeTruthy();
    expect(screen.getByText('Information is relevant if it can change a decision.')).toBeTruthy();
  });

  test('10. a worked_example block renders the problem, every step with its reasoning, and the final answer', async () => {
    await render(
      <LearningBlocks
        whatYoullLearn={['x']}
        blocks={[{
          type: 'worked_example',
          problem: 'Solve x^2 - 5x + 6 = 0',
          concept: 'Factoring',
          steps: [
            { step: 1, action: 'Factor the expression', equation: '(x-2)(x-3)=0', why: 'A product is zero only if one factor is zero.' },
          ],
          finalAnswer: 'x = 2 or x = 3',
        }]}
        colors={colors}
      />
    );
    expect(screen.getByText('Solve x² - 5x + 6 = 0', { exact: false })).toBeTruthy();
    expect(screen.getByText('Step 1: Factor the expression')).toBeTruthy();
    expect(screen.getByText('(x-2)(x-3)=0')).toBeTruthy();
    expect(screen.getByText('Why: A product is zero only if one factor is zero.')).toBeTruthy();
    expect(screen.getByText('Answer: x = 2 or x = 3')).toBeTruthy();
  });

  // 12. poem/source excerpt must stay visually distinct from the AI's own
  // explanation — never silently rewritten and presented as the original.
  test('12. a poem_line block clearly labels ORIGINAL vs SIMPLE EXPLANATION and keeps the exact source text', async () => {
    await render(
      <LearningBlocks
        whatYoullLearn={['x']}
        blocks={[{ type: 'poem_line', sourceText: 'मैं बीज बोता हूँ', explanation: 'The speaker plants a seed of hope.' }]}
        colors={colors}
      />
    );
    expect(screen.getByText('ORIGINAL POEM / SOURCE LINE')).toBeTruthy();
    expect(screen.getByText('मैं बीज बोता हूँ')).toBeTruthy();
    expect(screen.getByText('SIMPLE EXPLANATION')).toBeTruthy();
    expect(screen.getByText('The speaker plants a seed of hope.')).toBeTruthy();
  });

  // 11. Hindi/Unicode content survives storage/API/rendering.
  test('11. Hindi/Unicode text renders byte-for-byte, not mangled or transliterated', async () => {
    await render(
      <LearningBlocks
        whatYoullLearn={['हिंदी में समझें']}
        blocks={[{ type: 'key_terms', items: [{ term: 'संज्ञा', definition: 'किसी व्यक्ति, वस्तु या स्थान का नाम' }] }]}
        colors={colors}
      />
    );
    expect(screen.getByText('हिंदी में समझें', { exact: false })).toBeTruthy();
    expect(screen.getByText('संज्ञा — किसी व्यक्ति, वस्तु या स्थान का नाम')).toBeTruthy();
  });

  test('9. an unknown/unrecognized block type is silently skipped, not rendered as an empty box', async () => {
    await render(
      <LearningBlocks
        whatYoullLearn={['x']}
        blocks={[
          { type: 'explanation', text: 'Real content.' },
          { type: 'some_future_block_type', foo: 'bar' },
        ]}
        colors={colors}
      />
    );
    expect(screen.getByText('Real content.')).toBeTruthy();
    expect(screen.queryByText('bar')).toBeNull();
  });

  test('9. no whatYoullLearn provided -> that section is omitted entirely, not shown empty', async () => {
    await render(<LearningBlocks blocks={[{ type: 'explanation', text: 'x' }]} colors={colors} />);
    expect(screen.queryByText("WHAT YOU'LL LEARN")).toBeNull();
  });

  test('a chemical_equation block renders the equation and its explanation', async () => {
    await render(
      <LearningBlocks
        whatYoullLearn={['x']}
        blocks={[{ type: 'chemical_equation', equation: '2H2 + O2 -> 2H2O', explanation: 'Hydrogen burns in oxygen to form water.' }]}
        colors={colors}
      />
    );
    expect(screen.getByText('2H2 + O2 -> 2H2O')).toBeTruthy();
    expect(screen.getByText('Hydrogen burns in oxygen to form water.')).toBeTruthy();
  });
});

describe('LearningBlocks - drawn diagrams', () => {
  test('process, comparison, timeline, cause-effect and tables are drawn, not listed', async () => {
    const c: any = { cardDark: '#fff', textMain: '#111', textMuted: '#666', borderColor: '#ccc', primary: '#0a7', accentGreen: '#0a7', accentYellow: '#9A7B2E', bgDark: '#F5F3EE' };
    await render(<LearningBlocks colors={c} blocks={[
      { type: 'process', title: 'Water cycle', steps: ['Evaporation', 'Condensation', 'Rain'] },
      { type: 'comparison', title: 'Cells', items: [{ name: 'Plant cell', description: 'cell wall' }, { name: 'Animal cell', description: 'no cell wall' }] },
      { type: 'timeline', title: 'Freedom', events: [{ date: '1857', description: 'Revolt' }, { date: '1947', description: 'Independence' }] },
      { type: 'cause_and_effect', title: 'Why', items: [{ cause: 'No rain', effect: 'Dry fields' }] },
      { type: 'table', caption: 'Place value', headers: ['Tens', 'Ones'], rows: [['4', '7']] },
    ]} />);
    for (const kind of ['flow', 'compare', 'timeline', 'cause_effect', 'table']) expect(screen.getByTestId(`scene-visual-${kind}`)).toBeTruthy();
    expect(screen.getByText('1. Evaporation')).toBeTruthy();
    expect(screen.getByText('Plant cell')).toBeTruthy();
  });
});
