export const GOLD = '#BAA467';
export const GOLD_BG = '#BAA46718';
export const GOLD_BORDER = '#BAA46740';

export const ICONS = [
  'check-circle', 'book-open', 'sun', 'moon', 'droplet',
  'activity', 'shield', 'smile', 'star', 'coffee',
  'edit-3', 'music', 'heart', 'zap', 'wind',
] as const;

export const COIN_OPTIONS = ['5', '10', '15', '20'];

// Prepopulated task suggestions per icon
export const TASK_SUGGESTIONS: Record<string, string[]> = {
  'check-circle': ['Complete homework', 'Tidy up your room', 'Pack school bag'],
  'book-open':    ['Read for 20 minutes', 'Read a storybook', 'Practice spellings'],
  'sun':          ['Morning exercise', 'Wake up on time', 'Drink water in the morning'],
  'moon':         ['Sleep by 9 PM', 'No screen time after 8 PM', 'Brush teeth before bed'],
  'droplet':      ['Drink 6 glasses of water', 'Water the plants', 'Wash hands before meals'],
  'activity':     ['30 min outdoor play', 'Skipping for 10 minutes', 'Yoga or stretching'],
  'shield':       ['No junk food today', 'Eat fruits and vegetables', 'Take vitamins'],
  'smile':        ['Help a family member', 'Say something kind to someone', 'Practice gratitude'],
  'star':         ['Complete Aivorah lesson', 'Practise maths for 15 mins', 'Revise today\'s chapters'],
  'coffee':       ['Eat breakfast on time', 'Finish lunch without distraction', 'No sugar today'],
  'edit-3':       ['Write in your journal', 'Practice handwriting', 'Draw or sketch for 10 mins'],
  'music':        ['Practice instrument for 15 mins', 'Listen to calm music', 'Sing along to a song'],
  'heart':        ['Call grandparents', 'Do something kind', 'Help with household chores'],
  'zap':          ['Study for 1 hour', 'Complete all assignments', 'Review notes from school'],
  'wind':         ['10 min meditation', 'Deep breathing exercise', 'Spend time outdoors'],
};
