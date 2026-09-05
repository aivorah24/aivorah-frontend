export interface ChatMsg {
  id: number;
  role: 'user' | 'ai';
  text: string;
}
