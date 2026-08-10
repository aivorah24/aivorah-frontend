import type { AskImage } from '../../../services/aiMentorApi';

export interface Message {
  id: number;
  role: 'user' | 'ai';
  text: string;
  isError?: boolean;
  images?: AskImage[];
}
