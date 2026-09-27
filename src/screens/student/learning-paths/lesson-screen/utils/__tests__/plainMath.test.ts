import { plainMath, plainMathDeep } from '../plainMath';

describe('plainMath', () => {
  test.each([
    ['because $4 \\times 4 = 16$.', 'because 4 × 4 = 16.'],
    ['We use the symbol $\\sqrt{}$ to denote', 'We use the symbol √ to denote'],
    ['$\\sqrt{49} = 7$', '√49 = 7'],
    ['$\\sqrt{a+b}$', '√(a+b)'],
    ['Area = Side^2', 'Area = Side²'],
    ['$x^{2} + y^{3}$', 'x² + y³'],
    ['$\\frac{3}{4}$ of 20', '3/4 of 20'],
    ['$\\sqrt[3]{27} = 3$', '∛27 = 3'],
    ['$\\pm 8$', '± 8'],
  ])('%s', (input, out) => {
    expect(plainMath(input)).toBe(out);
  });

  test('leaves ordinary text and image urls alone', () => {
    expect(plainMath('A square has four equal sides.')).toBe('A square has four equal sides.');
    expect(plainMathDeep({ type: 'image', url: 'https://x/a^2.png', caption: '$x^2$' })).toEqual({ type: 'image', url: 'https://x/a^2.png', caption: 'x²' });
  });
});
