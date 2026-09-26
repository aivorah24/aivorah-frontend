import { buildReasoningListen } from '../listenFromBlocks';

const camel = {
  blocks: [
    { type: 'overview', text: "How can a few tiny drops of blood on a dusty path reveal the length of a camel's tail?" },
    { type: 'prose_excerpt', sourceText: 'I noticed small droplets of blood along the track, likely from mosquito bites.', explanation: 'Har Datt explains his deduction.' },
    { type: 'visual_representation', url: 'https://x/y.png', caption: 'c' },
    {
      type: 'process', title: 'Deductive Reasoning Flow',
      steps: [
        'Action: Har Datt notices the track.',
        'Evidence: Small droplets of blood are found.',
        'Thought: Mosquito bites are the likely cause.',
        'Reasoning: A long tail would fend off pests.',
        'Conclusion: The camel must have a short tail.',
      ],
    },
    { type: 'key_points', items: ['Deep-dive question: How does Dev Datt read the footprints?'] },
    { type: 'key_terms', items: [{ term: 'Deduction', definition: 'Reaching a conclusion from evidence. Context clue: the King praises it.' }] },
  ],
};

describe('buildReasoningListen', () => {
  test('turns a reasoning-flow lesson into ordered listen steps with each card mapped to its step', () => {
    const r = buildReasoningListen(camel)!;
    expect(r.cards.map((c) => c.label)).toEqual(['Action', 'Evidence', 'Thought', 'Reasoning', 'Conclusion']);
    expect(r.steps.map((s) => s.label)).toEqual(['Introduction', 'From the book', 'Action', 'Evidence', 'Thought', 'Reasoning', 'Conclusion', 'Think deeper', 'Key words']);
    expect(r.stepToCard).toEqual([null, null, 0, 1, 2, 3, 4, null, null]);
    expect(r.steps.length).toBe(r.stepToCard.length);
  });

  test('card steps are spoken with their label and end with a full stop', () => {
    const r = buildReasoningListen(camel)!;
    expect(r.steps[2].text).toBe('Action. Har Datt notices the track.');
    expect(r.steps.every((s) => /[.!?]$/.test(s.text))).toBe(true);
  });

  test('deep-dive prefix is dropped and the context clue is not read out as part of the meaning', () => {
    const r = buildReasoningListen(camel)!;
    expect(r.steps[7].text).toBe('How does Dev Datt read the footprints?');
    expect(r.steps[8].text).toBe('Deduction means Reaching a conclusion from evidence.');
  });

  test('exposes the book sentence for the follow-along view', () => {
    expect(buildReasoningListen(camel)!.bookQuote).toContain('small droplets of blood');
  });

  test('labels without a "Label:" prefix fall back to Step N', () => {
    const r = buildReasoningListen({ blocks: [{ type: 'process', title: 'Logic chain', steps: ['one', 'two', 'three'] }] })!;
    expect(r.cards.map((c) => c.label)).toEqual(['Step 1', 'Step 2', 'Step 3']);
  });

  describe('with a saved narration script', () => {
    const script = [
      { card: null, heading: 'Introduction', text: 'Imagine knowing a missing animal without seeing it' },
      { card: 0, heading: 'Action', text: 'Har Datt looks along the track.' },
      { card: 1, heading: 'Evidence', text: 'He notices small droplets of blood.' },
      { card: 4, heading: 'Conclusion', text: 'The camel has a short tail.' },
      { card: 9, heading: 'Bad index', text: 'Out of range card.' },
    ];

    test("uses the script for the steps and takes each step's card from it", () => {
      const r = buildReasoningListen({ ...camel, listenScript: script })!;
      expect(r.steps.map((s) => s.label)).toEqual(['Introduction', 'Action', 'Evidence', 'Conclusion', 'Bad index']);
      expect(r.stepToCard).toEqual([null, 0, 1, 4, null]);
      expect(r.cards.length).toBe(5);
      expect(r.bookQuote).toContain('small droplets of blood');
    });

    test('adds a full stop to a step that lacks one so the sentence splits correctly', () => {
      expect(buildReasoningListen({ ...camel, listenScript: script })!.steps[0].text).toBe('Imagine knowing a missing animal without seeing it.');
    });

    test('ignores malformed entries and falls back to the block-derived steps when nothing usable is left', () => {
      const r = buildReasoningListen({ ...camel, listenScript: [{ card: 0 }, null, { heading: 'x', text: '  ' }] })!;
      expect(r.steps.map((s) => s.label)[0]).toBe('Introduction');
      expect(r.steps.length).toBe(9);
    });

    test('an empty script keeps the block-derived narration', () => {
      expect(buildReasoningListen({ ...camel, listenScript: [] })!.steps.length).toBe(9);
    });
  });

  test.each([
    ['no blocks', {}],
    ['a plain process that is not a reasoning flow', { blocks: [{ type: 'process', title: 'Steps of digestion', steps: ['a', 'b', 'c'] }] }],
    ['too few steps', { blocks: [{ type: 'process', title: 'Reasoning flow', steps: ['a', 'b'] }] }],
    ['too many steps', { blocks: [{ type: 'process', title: 'Reasoning flow', steps: ['1', '2', '3', '4', '5', '6', '7', '8'] }] }],
  ])('returns null for %s (keeps the existing Listen behaviour)', (_n, payload) => {
    expect(buildReasoningListen(payload)).toBeNull();
  });
});

describe('play script (lines)', () => {
  const withPlay = {
    ...camel,
    listenScript: [
      {
        card: null, heading: 'Scene II', text: 'A. B.',
        lines: [
          { speaker: 'Har Datt', text: 'I noticed small droplets of blood along the track,', card: 1 },
          { speaker: 'Narrator', text: 'The Merchant bows.', stage: true },
          { speaker: 'King', text: 'Extraordinary!', direction: 'Marvelling', card: 'x' },
          { speaker: 'King', text: '   ' },
        ],
      },
    ],
  };

  test('keeps valid lines with speaker, direction, stage flag and card, and drops blank or bad ones', () => {
    const [step] = buildReasoningListen(withPlay)!.steps;
    expect(step.lines).toEqual([
      { speaker: 'Har Datt', text: 'I noticed small droplets of blood along the track,', card: 1 },
      { speaker: 'Narrator', text: 'The Merchant bows.', stage: true },
      { speaker: 'King', text: 'Extraordinary!', direction: 'Marvelling' },
    ]);
  });

  test('a step without lines stays a plain narration step', () => {
    const r = buildReasoningListen({ ...camel, listenScript: [{ card: 0, heading: 'Action', text: 'Har Datt looks.' }] })!;
    expect(r.steps[0].lines).toBeUndefined();
  });

  test('keeps a book page and a recorded audio url, but only for real values (https, positive integer)', () => {
    const r = buildReasoningListen({
      ...camel,
      listenScript: [{ card: null, heading: 'S', text: 'x', lines: [
        { speaker: 'King', text: 'Speak.', page: 33, audio: 'https://cdn/x.mp3' },
        { speaker: 'King', text: 'Again.', page: 0, audio: 'http://insecure/x.mp3' },
      ] }],
    })!;
    expect(r.steps[0].lines).toEqual([
      { speaker: 'King', text: 'Speak.', page: 33, audio: 'https://cdn/x.mp3' },
      { speaker: 'King', text: 'Again.' },
    ]);
  });
});

describe('a piece read aloud with no reasoning chain', () => {
  const essay = {
    blocks: [{ type: 'overview', text: 'How did 90 soldiers hold an airport?' }],
    listenScript: [{ card: null, heading: 'A Tribute', text: 'x', lines: [{ speaker: 'Narrator', text: 'This is a tribute.', page: 2 }] }],
  };

  test('still gets its script, with no chain cards', () => {
    const r = buildReasoningListen(essay)!;
    expect(r.cards).toEqual([]);
    expect(r.steps[0].lines).toEqual([{ speaker: 'Narrator', text: 'This is a tribute.', page: 2 }]);
    expect(r.stepToCard).toEqual([null]);
  });

  test('without a script or a chain it keeps the normal Listen behaviour', () => {
    expect(buildReasoningListen({ blocks: [{ type: 'overview', text: 'x' }] })).toBeNull();
    expect(buildReasoningListen({ blocks: [], listenScript: [{ heading: 'a', text: 'b' }] })).toBeNull();
  });
});
