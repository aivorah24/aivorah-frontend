// vercel.json cache rules. Expo names its page chunks by an md5 of their
// contents, so they are safe to cache for a year. The start-up bundles
// (index-, __common-, __expo-metro-runtime-) keep the SAME name when only the
// chunk map inside them changes; caching those as immutable left browsers on a
// stale index that loaded an old page chunk and blanked the app (2026-11-09).
import vercel from '../../../vercel.json';

function cacheControlFor(path: string): string[] {
  return (vercel as any).headers
    .filter((rule: any) => new RegExp(`^${rule.source}$`).test(path))
    .flatMap((rule: any) => rule.headers.filter((h: any) => h.key === 'Cache-Control').map((h: any) => h.value));
}

test.each([
  '/_expo/static/js/web/index-c9b5249f8983775ce387760377ea108e.js',
  '/_expo/static/js/web/__common-0893fa7d2dc48927546323b147e99e97.js',
  '/_expo/static/js/web/__expo-metro-runtime-0c48b0beee2d3ce6030b475fcc5b1846.js',
])('start-up bundle %s is re-checked on every visit', (path) => {
  expect(cacheControlFor(path)).toEqual(['public, max-age=0, must-revalidate']);
});

test.each([
  '/_expo/static/js/web/DigestScreen-ac31d45c1671fc2d9f561d48c17c5fb0.js',
  '/_expo/static/js/web/QuizScreen-a8519de91960bcd52b2ec4fbb028dd53.js',
  '/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ca4b48e04dc1ce10bfbddb262c8b835f.ttf',
])('content-named file %s is cached for a year', (path) => {
  expect(cacheControlFor(path)).toEqual(['public, max-age=31536000, immutable']);
});

test('pages themselves (index.html) are not given a long cache', () => {
  expect(cacheControlFor('/current-affairs')).toEqual([]);
});
