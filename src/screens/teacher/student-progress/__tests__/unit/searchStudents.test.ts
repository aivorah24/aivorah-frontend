import { searchByName } from '../../utils/searchStudents';

describe('searchByName', () => {
  test('empty query returns every real item unchanged', () => {
    const items = [{ name: 'Aarav' }, { name: 'Bela' }];
    expect(searchByName(items, '')).toEqual(items);
  });

  test('a real substring match narrows to matching names, case-insensitive', () => {
    const items = [{ name: 'Aarav Kapoor' }, { name: 'Bela Rao' }];
    expect(searchByName(items, 'kapoor')).toEqual([{ name: 'Aarav Kapoor' }]);
  });

  test('whitespace-only query behaves the same as empty — no filtering', () => {
    const items = [{ name: 'Aarav' }, { name: 'Bela' }];
    expect(searchByName(items, '   ')).toEqual(items);
  });

  test('no real match -> empty result, not a crash', () => {
    const items = [{ name: 'Aarav' }];
    expect(searchByName(items, 'zzz')).toEqual([]);
  });
});
