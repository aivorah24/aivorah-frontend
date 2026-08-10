export interface Challenge {
  id: string;
  title: string;
  description: string;
  grade: string;
  curriculum: string;
  subject: string;
  chapterId: number | null;
  topic: string;
  difficulty: string;
  xpReward: number;
  questionCount: number;
  timeLimitMinutes: number;
  type: string;
  category: string;
  imageUrl: string | null;
  // annotated by server
  assignmentId: string | null;
  status: 'available' | 'assigned' | 'completed';
  score: number | null;
  xpAwarded: number | null;
  dueDate: string | null;
  assignedByRole: string | null;
}

export interface Question {
  question: string;
  options: string[];
  answer: string;
  type?: 'mcq' | 'fill_blank' | 'open_ended';
  acceptAnswers?: string[] | null;
}
