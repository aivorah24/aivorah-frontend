import { parseAIReply, replySegments, spokenWord, wordAt } from '../aiReply';

describe('parseAIReply', () => {
  test('a --- line becomes a divider, not text', () => {
    expect(parseAIReply('Intro\n---\nMore')).toEqual([
      { kind: 'line', text: 'Intro' }, { kind: 'rule' }, { kind: 'line', text: 'More' },
    ]);
  });

  test('a markdown table becomes a table block', () => {
    const b = parseAIReply('| Planet | Moons |\n|---|:---:|\n| **Earth** | 1 |\n| Mars | 2 |');
    expect(b).toEqual([{ kind: 'table', header: ['Planet', 'Moons'], rows: [['Earth', '1'], ['Mars', '2']] }]);
  });

  test('headings, bullets and numbered lines are recognised', () => {
    expect(parseAIReply('## Key idea\n- point\n2. step')).toEqual([
      { kind: 'heading', text: 'Key idea' },
      { kind: 'bullet', text: 'point' },
      { kind: 'numbered', text: 'step', marker: '2.' },
    ]);
  });

  test('image markdown and image placeholders are dropped', () => {
    expect(parseAIReply('![diagram](https://x/y.png)\n[Image: the water cycle]\nRain falls.')).toEqual([
      { kind: 'line', text: 'Rain falls.' },
    ]);
  });
});

describe('speech', () => {
  test('dashes, pipes, emoji and links are not spoken', () => {
    expect(spokenWord('---')).toBe('');
    expect(spokenWord('|')).toBe('');
    expect(spokenWord('🌟')).toBe('');
    expect(spokenWord('1️⃣')).toBe('');
    expect(spokenWord('☀️')).toBe('');
    expect(spokenWord('https://example.com')).toBe('');
    expect(spokenWord('**great**')).toBe('great');
  });

  test('a line is spoken without markdown and maps words back for highlighting', () => {
    const [seg] = replySegments(parseAIReply('🌟 **Half** is 1/2 — easy!'));
    expect(seg.speech).toBe('Half is one half easy!');
    expect(wordAt(seg.offsets, seg.speech.indexOf('one'))).toBe(3);
  });

  test('table rows are read as "Header: value" and dividers are skipped', () => {
    const segs = replySegments(parseAIReply('Facts\n---\n| Planet | Moons |\n|---|---|\n| Earth | 1 |'));
    expect(segs.map((s) => s.speech)).toEqual(['Facts', 'Planet: Earth, Moons: 1.']);
    expect(segs[1]).toMatchObject({ block: 2, row: 0 });
  });
});
