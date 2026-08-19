// Smoke test — proves the Jest + jest-expo setup actually works before any
// real screen/component tests are written on top of it.

test('jest is wired up and can run a basic assertion', () => {
  expect(1 + 1).toBe(2);
});
