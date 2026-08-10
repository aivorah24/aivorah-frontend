export const TEAL = '#9FB2A4';  // sage
export const GOLD = '#BAA467';
export const SAGE = '#82A896';

const ICON_MAP: Record<string, string> = {
  smile: 'smile', droplet: 'droplet', sun: 'sun', shield: 'shield',
  moon: 'moon', activity: 'activity', 'book-open': 'book-open', sunrise: 'sunrise',
  star: 'star', heart: 'heart', zap: 'zap', check: 'check-circle',
};

export function safeIcon(name: string): any {
  return ICON_MAP[name] ?? 'check-circle';
}
