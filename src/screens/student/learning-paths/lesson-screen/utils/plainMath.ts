const SUP: Record<string, string> = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', n: 'ⁿ', '-': '⁻', '+': '⁺' };
const SYMBOLS: [RegExp, string][] = [
  [/\\times/g, '×'], [/\\div/g, '÷'], [/\\cdot/g, '·'], [/\\pm/g, '±'], [/\\mp/g, '∓'],
  [/\\neq/g, '≠'], [/\\leq?/g, '≤'], [/\\geq?/g, '≥'], [/\\approx/g, '≈'], [/\\infty/g, '∞'],
  [/\\pi/g, 'π'], [/\\theta/g, 'θ'], [/\\alpha/g, 'α'], [/\\beta/g, 'β'], [/\^\\circ|\^\{\\circ\}|\\degree/g, '°'],
  [/\\rightarrow|\\to\b/g, '→'], [/\\Rightarrow/g, '⇒'], [/\\left|\\right/g, ''], [/\\,|\\;|\\!|\\quad/g, ' '],
  [/\\text\{([^}]*)\}/g, '$1'], [/\\mathrm\{([^}]*)\}/g, '$1'],
];

const sup = (s: string) => (s.split('').every((c) => SUP[c]) ? s.split('').map((c) => SUP[c]).join('') : `^${s}`);

// Turns the LaTeX the lesson generator writes ("$4 \times 4 = 16$", "$\sqrt{49}$", "x^2") into plain maths a
// student can read ("4 × 4 = 16", "√49", "x²"), since the app has no LaTeX renderer.
export function plainMath(text: string): string {
  if (typeof text !== 'string' || !/[\\$^]/.test(text)) return text;
  let s = text;
  for (let i = 0; i < 3; i += 1) {
    s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)').replace(/\(([^()\s\/]+)\)\/\(([^()\s\/]+)\)/g, '$1/$2');
    s = s.replace(/\\sqrt\[3\]\{([^{}]*)\}/g, '∛$1')
      .replace(/\\sqrt\{([^{}]*)\}/g, (_m, x: string) => (x ? (/^[\w.]+$/.test(x) ? `√${x}` : `√(${x})`) : '√'));
  }
  s = s.replace(/\\sqrt/g, '√');
  for (const [re, to] of SYMBOLS) s = s.replace(re, to);
  s = s.replace(/\^\{([^{}]*)\}/g, (_m, e: string) => sup(e)).replace(/\^([0-9n])/g, (_m, e: string) => sup(e));
  s = s.replace(/\$\$?/g, '').replace(/\\([{}])/g, '$1').replace(/[{}]/g, '');
  return s.replace(/[ \t]{2,}/g, ' ');
}

// Applies plainMath to every string inside a lesson block (text, items, steps, rows...), leaving urls untouched.
export function plainMathDeep<T>(value: T): T {
  if (typeof value === 'string') return plainMath(value) as unknown as T;
  if (Array.isArray(value)) return value.map(plainMathDeep) as unknown as T;
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) out[k] = k === 'url' ? v : plainMathDeep(v);
    return out;
  }
  return value;
}
