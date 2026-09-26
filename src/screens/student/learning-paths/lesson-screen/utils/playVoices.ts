import type { VoiceProfile } from './audio';

const BASE: Record<string, VoiceProfile> = {
  narrator: { gender: 'f', pitch: 1.0, rate: 0.95 },
  'ram datt': { gender: 'm', pitch: 0.95 },
  'shiv datt': { gender: 'm', pitch: 1.05, rate: 1.03 },
  'har datt': { gender: 'm', pitch: 0.85, rate: 0.95 },
  'dev datt': { gender: 'm', pitch: 1.15 },
  merchant: { gender: 'm', pitch: 1.2, rate: 1.05 },
  king: { gender: 'm', pitch: 0.7, rate: 0.9 },
  sentry: { gender: 'm', pitch: 0.9, rate: 1.0 },
  'all four': { gender: 'm', pitch: 1.0 },
};

const MOODS: [RegExp, { pitch: number; rate: number }][] = [
  [/astonish|surpris|taken aback|marvel/i, { pitch: 0.15, rate: 0.05 }],
  [/indignant|angry/i, { pitch: 0.1, rate: 0.1 }],
  [/breathless|panting|anxious/i, { pitch: 0.05, rate: 0.15 }],
  [/thoughtful|nodding|pausing/i, { pitch: -0.05, rate: -0.12 }],
  [/command/i, { pitch: -0.1, rate: -0.05 }],
  [/impress|smiling/i, { pitch: 0.05, rate: -0.03 }],
];

// Distinct voice per character, nudged by the stage direction (astonished, thoughtful...).
export function profileFor(speaker: string, direction?: string): VoiceProfile {
  const base = BASE[speaker.trim().toLowerCase()] || BASE.narrator;
  const mood = direction ? MOODS.find(([re]) => re.test(direction))?.[1] : undefined;
  return {
    gender: base.gender,
    pitch: Math.max(0.5, Math.min(2, (base.pitch ?? 1) + (mood?.pitch ?? 0))),
    rate: Math.max(0.6, Math.min(1.4, (base.rate ?? 1) + (mood?.rate ?? 0))),
  };
}
