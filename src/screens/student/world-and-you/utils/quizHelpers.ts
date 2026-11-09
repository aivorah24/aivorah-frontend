import { CATEGORY_ICONS } from '../constants';

export function categoryIcon(cat: string): any {
  return CATEGORY_ICONS[cat] ?? 'star';
}
