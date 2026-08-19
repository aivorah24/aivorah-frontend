// Unit tests for getPageMoodProfile — the only pure, easily-testable piece
// of ambientAudio.ts. The rest of the module (Web Audio API synthesis,
// <audio> playback) is DOM/Audio-heavy and out of scope here.

import { getPageMoodProfile } from '../ambientAudio';

describe('getPageMoodProfile', () => {
  test('matches "night" keywords from the page text', () => {
    const profile = getPageMoodProfile({ text: 'It is time to sleep now, sweet dreams.' }, 'ambarisha');
    expect(profile).toEqual({ root: 196, style: 'veena', intensity: 0.65 });
  });

  test('matches "tense" keywords, taking priority over a later "triumphant" keyword in the same text', () => {
    const profile = getPageMoodProfile({ text: 'A fierce demon roared, but then came the golden treasure.' }, 'ambarisha');
    expect(profile).toEqual({ root: 175, style: 'tabla', bpm: 78, intensity: 1.2 });
  });

  test('matches "water" keywords from the scene label, not just the body text', () => {
    const profile = getPageMoodProfile({ sceneLabel: 'By the River', text: 'They walked along quietly.' }, 'matsya_fish');
    expect(profile).toEqual({ root: 247, style: 'flute', intensity: 0.9 });
  });

  test('no keyword match -> falls back to the story-wide STORY_AMBIENT profile', () => {
    const profile = getPageMoodProfile({ text: 'Nothing special happens on this page.' }, 'hanuman');
    expect(profile).toEqual({ root: 196, style: 'tabla' });
  });

  test('no keyword match and an unknown storyId -> falls back to the hardcoded default', () => {
    const profile = getPageMoodProfile({ text: 'Nothing special happens.' }, 'does-not-exist');
    expect(profile).toEqual({ root: 220, style: 'tanpura' });
  });

  test('null/undefined page -> no crash, falls back to the story profile', () => {
    expect(getPageMoodProfile(null, 'hanuman')).toEqual({ root: 196, style: 'tabla' });
    expect(getPageMoodProfile(undefined, 'hanuman')).toEqual({ root: 196, style: 'tabla' });
  });
});
