import type { CourseVideo } from './types';

export const COURSE_VIDEOS: CourseVideo[] = [
  {
    id: 'course-1',
    eyebrow: 'Course 1 · 8 min overview',
    title: 'From Average Prompts to Outstanding Teaching',
    desc:
      'The complete Course 1 walkthrough. Learn the 4-Part Prompt Formula (Context, Role, Task, Output Format), turn one prompt into a full lesson pack, follow the Research → Plan → Create → Review → Teach → Reflect workflow, and verify every AI output before you teach.',
    url: 'https://res.cloudinary.com/di5iq2mmb/video/upload/v1782886474/aivorah/videos/aivorah_teacher_intro.mp4',
    outcomes: [
      { icon: 'edit-3', title: 'Write better prompts', desc: 'Use the 4-part formula: context, role, task, output format.' },
      { icon: 'clock', title: 'Save time on planning', desc: 'Turn one clear prompt into a full classroom-ready lesson pack.' },
      { icon: 'file-text', title: 'Create resources faster', desc: 'Draft lesson plans, worksheets, assessments, and parent updates.' },
      { icon: 'shield', title: 'Verify with confidence', desc: 'Check accuracy, bias, level, and curriculum alignment before teaching.' },
    ],
  },
  {
    id: 'course-2',
    eyebrow: 'Course 2 · 3 min overview',
    title: 'Create Engaging Learning Experiences with AI',
    desc:
      'Turn everyday lessons into active, memorable experiences. Move from passive to active learning, spin one topic into many activities — Think-Pair-Share, Gallery Walk, Role Play, Quiz Challenge, Story Building, Escape Room — and design inquiry, competency, and critical-thinking tasks you can build once and reuse forever.',
    url: 'https://res.cloudinary.com/di5iq2mmb/video/upload/v1782915506/aivorah/videos/aivorah_teacher_course2.mp4',
    outcomes: [
      { icon: 'zap', title: 'Engage every learner', desc: 'Shift from passive listening to active participation.' },
      { icon: 'grid', title: 'One topic, many activities', desc: 'Think-Pair-Share, Gallery Walk, Role Play, Quiz, Escape Room.' },
      { icon: 'compass', title: 'Deeper understanding', desc: 'Design inquiry, competency, and critical-thinking tasks.' },
      { icon: 'refresh-cw', title: 'Build once, reuse forever', desc: 'Create engaging resources you can reuse across classes.' },
    ],
  },
];

export const PATH_BENEFITS = [
  'Practical strategies you can use immediately',
  'Save hours of planning time each week',
  'Improve engagement with clearer resources',
  'Build confidence using AI responsibly',
];
