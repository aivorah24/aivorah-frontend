export interface ChatMsg {
  id: number;
  role: 'user' | 'ai';
  text: string;
}

export interface Faq {
  q: string;
  a: string;
}
