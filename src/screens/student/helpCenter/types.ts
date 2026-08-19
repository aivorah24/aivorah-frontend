import type { ComponentProps } from 'react';
import type { Feather } from '@expo/vector-icons';

export interface ChatMsg {
  id: number;
  role: 'user' | 'ai';
  text: string;
  time: string;
}

export interface HelpTopic {
  label: string;
  icon: ComponentProps<typeof Feather>['name'];
  color: string;
  desc: string;
  screen: string;
  articles: string[];
}
