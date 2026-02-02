export type Channel = 'whatsapp' | 'linkedin' | 'gmail';

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

export type ConversationStatus = 'open' | 'resolved' | 'muted';

export type ContactTag = 'hot' | 'warm' | 'cold';

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  company?: string;
  position?: string;
  tags: ContactTag[];
  notes: string[];
  lastSeen?: Date;
  isOnline?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  timestamp: Date;
  isOutgoing: boolean;
  status: MessageStatus;
  attachments?: Attachment[];
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'file' | 'link';
  url: string;
  size?: number;
}

export interface Conversation {
  id: string;
  channel: Channel;
  contact: Contact;
  messages: Message[];
  lastMessage?: Message;
  unreadCount: number;
  status: ConversationStatus;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InternalComment {
  id: string;
  conversationId: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: Date;
}
