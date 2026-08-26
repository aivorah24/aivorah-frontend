export interface Contact {
  id: string;
  name: string;
  email: string;
  role: string;
  context: string; // e.g. "Teacher of Alex" or "Parent of Alex"
}

export interface Conversation {
  otherEmail: string;
  otherName: string;
  otherRole: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  sender_email: string;
  sender_name: string;
  sender_role: string;
  recipient_email: string;
  content: string;
  created_at: string;
  read_at: string | null;
  is_edited: boolean;
  reply_to?: { id: string; senderName: string; content: string } | null;
  reactions?: Record<string, number>;
  myReaction?: string | null;
}

export type Attachment = { url: string; name: string; size: number; type: string };

export type ConvoFilter = 'all' | 'unread' | 'starred' | 'staff';

export type ContextMenuState = { msgId: string; x: number; y: number; isMine: boolean } | null;
