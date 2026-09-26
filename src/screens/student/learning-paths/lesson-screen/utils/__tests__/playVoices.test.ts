import { profileFor } from '../playVoices';

describe('profileFor', () => {
  test('each character gets a distinct voice profile', () => {
    const pitches = ['Narrator', 'Har Datt', 'Merchant', 'King'].map((s) => profileFor(s).pitch);
    expect(new Set(pitches).size).toBe(4);
  });

  test('a stage direction shifts the delivery: astonished is higher and quicker, thoughtful slower', () => {
    const plain = profileFor('Merchant');
    const astonished = profileFor('Merchant', 'Astonished');
    const thoughtful = profileFor('Har Datt', 'Pausing thoughtfully');
    expect(astonished.pitch!).toBeGreaterThan(plain.pitch!);
    expect(astonished.rate!).toBeGreaterThan(plain.rate!);
    expect(thoughtful.rate!).toBeLessThan(profileFor('Har Datt').rate!);
  });

  test('an unknown speaker falls back to the narrator voice', () => {
    expect(profileFor('Stranger')).toEqual(profileFor('Narrator'));
  });
});
