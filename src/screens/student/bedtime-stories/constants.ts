import type { VoiceOption, AmbientProfile } from './types';

export const TEAL   = '#9FB2A4';  // sage
export const FOREST = '#7E9A86';  // deep sage
export const PASTEL_GOLD = '#C5A56A'; // Aivorah warm pastel gold — Auto toggle + completion badges

export const VOICE_CONFIG: Record<VoiceOption, { label: string; icon: string; color: string }> = {
  grandmother: { label: 'Grandmother', icon: 'heart',  color: '#C08898' },  // Aivorah pastel rose
  grandfather: { label: 'Grandfather', icon: 'anchor', color: '#7EA8C0' },  // Aivorah pastel blue
};

export const PASTEL_GRAD: Record<string, [string, string]> = {
  '#7c3aed': ['#C5BD96', '#9FB2A4'],
  '#4f46e5': ['#BAA467', '#9FB2A4'],
  '#0ea5e9': ['#9FB2A4', '#C5BD96'],
  '#6366f1': ['#C5BD96', '#BAA467'],
  '#ea580c': ['#C0A07E', '#9FB2A4'],
  '#dc2626': ['#C5BD96', '#BAA467'],
  '#16a34a': ['#9FB2A4', '#C5BD96'],
  '#0891b2': ['#9FB2A4', '#C5BD96'],
  '#10b981': ['#9FB2A4', '#C5BD96'],
  '#f59e0b': ['#C0A07E', '#9FB2A4'],
};

export const COLLECTION_PASTEL: Record<string, string> = {
  'Srimad Bhagavatam': '#9B8FC0',
  'Ramayana':          '#C0A07E',
  'Bhagavad Gita':     '#82A896',
};

export const ICON_MAP: Record<string, string> = {
  crown: 'award', star: 'star', shield: 'shield',
  compass: 'compass', zap: 'zap', 'book-open': 'book-open', heart: 'heart',
};

export function safeIcon(name: string): string { return ICON_MAP[name] ?? 'book-open'; }

// Story-specific ambient music profiles
export const STORY_AMBIENT: Record<string, AmbientProfile> = {
  prahlada:             { root: 220,  style: 'tanpura' }, // devotional drone
  hanuman:              { root: 196,  style: 'tabla'   }, // energetic rhythm
  ramayana_rama_sita:   { root: 264,  style: 'flute'   }, // peaceful bansuri
  bhagavad_gita_arjuna: { root: 220,  style: 'veena'   }, // wisdom, meditative
  dhruva:               { root: 247,  style: 'tanpura' }, // determination drone
  ambarisha:            { root: 220,  style: 'veena'   }, // devotion, calm
  bharat:               { root: 264,  style: 'flute'   }, // gentle, lyrical
  // Mahabharata Tales — mood matched to each story
  churning_of_ocean:    { root: 207,  style: 'tabla'   }, // effort & rhythm of the churning
  dashavatara:          { root: 220,  style: 'tanpura' }, // grand, cosmic, divine
  endless_lamp:         { root: 277,  style: 'flute'   }, // warm, gentle light
  dharmakshetra:        { root: 220,  style: 'veena'   }, // inner reflection, wisdom
  actor_on_stage:       { root: 294,  style: 'flute'   }, // light, playful, lyrical
  chariot_of_mind:      { root: 196,  style: 'tabla'   }, // movement, holding the reins
  matsya_fish:          { root: 247,  style: 'flute'   }, // flowing water, gentle
  // Srimad Bhagavatam — Canto 8
  canto8_part1:         { root: 207,  style: 'tabla'   }, // Gajendra's struggle, churning rhythm
  canto8_part2:         { root: 220,  style: 'flute'   }, // Vamana's growth, Matsya's flowing waters
};

// ── Situational (per-page) ambient moods ──────────────────────────────────
// Each scene within a story can feel different — tense, joyful, watery, mysterious —
// so we sniff the page's scene icon + text for mood keywords and pick a matching
// ambient profile. Falls back to the story-wide STORY_AMBIENT profile if nothing matches.
export const MOOD_PROFILES: Record<string, AmbientProfile> = {
  tense:       { root: 175, style: 'tabla',   bpm: 78, intensity: 1.2  }, // danger, storms, fear
  triumphant:  { root: 294, style: 'tanpura', intensity: 1.15 },          // victory, treasure, light
  water:       { root: 247, style: 'flute',   intensity: 0.9  },          // oceans, rivers, rain
  mysterious:  { root: 165, style: 'veena',   intensity: 0.85 },          // secrets, riddles, deep questions
  playful:     { root: 311, style: 'flute',   intensity: 1.0  },          // children, laughter, lightness
  peaceful:    { root: 264, style: 'flute',   intensity: 0.8  },          // calm, prayer, gentle moments
  night:       { root: 196, style: 'veena',   intensity: 0.65 },          // sleepy, ending lullaby pages
};

// Keyword groups checked against the page's scene label/icon/emoji + narration text.
// Order matters — first match wins, so put the more specific moods first.
export const MOOD_KEYWORDS: { mood: string; words: RegExp }[] = [
  { mood: 'night',      words: /\b(sleep|sleepy|rest now|good ?night|close your eyes|sweet dreams|curtain falls|bedtime)\b/i },
  { mood: 'tense',      words: /\b(danger|frightened|terrible|fierce|demon|poison|storm|flood|battle|growl|roar|afraid|scary|dark smoke|sink(?:ing)?)\b/i },
  { mood: 'triumphant', words: /\b(nectar|treasure|golden|victory|celebrat|won|glow(?:ing)?|jewels?|lamp|shine|shining|triumph)\b/i },
  { mood: 'water',      words: /\b(ocean|river|sea|water|wave|flood|swam|swim|rain|fish|lake|pond)\b/i },
  { mood: 'mysterious', words: /\b(secret|wonder|mystery|riddle|soul|question|hidden|curious|strange)\b/i },
  { mood: 'playful',    words: /\b(laugh|giggle|child|playful|smiled|fun|game|dance)\b/i },
  { mood: 'peaceful',   words: /\b(pray|calm|gentle|quiet|peaceful|breathe|still)\b/i },
];

// ── Real royalty-free background tracks (preferred over the synth when present) ──
// A small library of mood tracks shared across stories. Drop the mp3 files into
// server/public/sounds/music/ — they are served at /sounds/music/<file>.mp3.
// If a file is missing/unsupported, playback falls back to the synth automatically.
export const MOOD_TRACK: Record<string, string> = {
  devotional: '/sounds/music/devotional.mp3', // calm sitar/tanpura — Bhagavatam devotion
  gentle:     '/sounds/music/gentle.mp3',     // soft flute — peaceful tales
  rhythmic:   '/sounds/music/rhythmic.mp3',   // light tabla — energetic / effort
  wisdom:     '/sounds/music/wisdom.mp3',     // meditative veena — Gita / reflection
  water:      '/sounds/music/water.mp3',      // flowing, oceanic — Matsya
  night:      '/sounds/music/night.mp3',      // soft bedtime lullaby
};

export const STORY_MOOD: Record<string, keyof typeof MOOD_TRACK> = {
  ramayana_rama_sita: 'gentle',     hanuman: 'rhythmic',        bhagavad_gita_arjuna: 'wisdom',
  ambarisha: 'devotional',          dhruva: 'devotional',       prahlada: 'devotional',
  bharat: 'gentle',                 churning_of_ocean: 'rhythmic', dashavatara: 'devotional',
  endless_lamp: 'gentle',           dharmakshetra: 'wisdom',    actor_on_stage: 'gentle',
  chariot_of_mind: 'rhythmic',      matsya_fish: 'water',
};

export function getPastelGradient(c: string): [string, string] {
  return PASTEL_GRAD[c] ?? ['#9FB2A4', '#C5BD96'];
}
