const ORDINALS: Record<string, string> = {
  '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five',
  '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten',
  '11': 'eleven', '12': 'twelve', '100': 'one hundred',
};
const DENOM: Record<string, string> = {
  '2': 'half', '3': 'thirds', '4': 'fourths', '5': 'fifths',
  '6': 'sixths', '7': 'sevenths', '8': 'eighths', '9': 'ninths',
  '10': 'tenths', '11': 'elevenths', '12': 'twelfths',
  '100': 'hundredths', '1000': 'thousandths',
};

export function preprocessForTTS(raw: string): string {
  return raw
    .replace(/\b(\d+)\/(\d+)\b/g, (_m, num, den) => {
      const n = ORDINALS[num] || num;
      const d = DENOM[den] || `over ${den}`;
      return `${n} ${d}`;
    })
    .replace(/\b(\d+)\.(\d+)\b/g, (_m, int, frac) => `${int} point ${frac}`)
    .replace(/\s*\+\s*/g, ' plus ')
    .replace(/\s*=\s*/g, ' equals ')
    .replace(/\s*×\s*/g, ' times ')
    .replace(/\s*÷\s*/g, ' divided by ');
}
