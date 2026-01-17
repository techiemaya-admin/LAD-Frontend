import { safeStorage } from '../utils/storage';
import { getApiUrl, defaultFetchOptions } from '../config/api';
import { logger } from '../lib/logger';
import { io, Socket } from 'socket.io-client';
import store from '../store/store';
import {
  addMessageToConversation,
  updateConversation
} from '../store/slices/conversationSlice';
import { addNotification } from '../store/slices/notificationSlice';

// Use backend URL directly
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://lad-backend-develop-741719885039.us-central1.run.app';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://lad-backend-develop-741719885039.us-central1.run.app';
let socket: Socket | null = null;

interface Conversation {
  id: string;
  [key: string]: unknown;
}

interface Message {
  id?: string | number;
  _id?: string | number;
  content?: string;
  role?: string;
  human_agent_id?: string | number;
  sender_name?: string;
  senderName?: string;
  created_at?: string | number;
  timestamp?: string | number;
  type?: string;
  metadata?: {
    tags?: unknown[];
    read_receipt?: boolean;
    delivery_status?: string;
  };
  message_status?: string;
  [key: string]: unknown;
}

interface ConversationActivityPayload {
  conversationId: string;
  messages?: Message[];
  lastMessage?: Message;
  updatedAt?: string | number;
  unread?: number;
  leadId?: string;
  lead?: { name?: string };
}

interface ConversationListener {
  (data: Conversation): void;
}

interface MessageListener {
  (msg: Message): void;
}

interface SendChannelMessageParams {
  channel: string;
  phone_number: string;
  message_text: string;
  conversation_id?: string;
  lead_id?: string;
  human_agent_id?: string;
  role?: string;
}

interface CurrentUser {
  id?: string;
  name?: string;
  [key: string]: unknown;
}

interface SocketStatus {
  connected: boolean;
  id: string | null;
  readyState: number | null;
  url: string;
  timestamp: string;
}

interface AssignHandlerParams {
  handler: string;
  humanAgentId: string | null;
}

class ChatService {
  conversationListeners: Set<ConversationListener>;
  messageListeners: Map<string, Set<MessageListener>>;
  socket: Socket | null;
  currentConversationId: string | null;

  constructor() {
    this.conversationListeners = new Set();
    this.messageListeners = new Map();
    this.socket = null;
    this.currentConversationId = null;
    this.initSocket();
  }

  initSocket(): void {
    if (!socket) {
      socket = io(SOCKET_URL, { 
        transports: ['websocket'],
        forceNew: true,
        autoConnect: true,
        timeout: 20000,
        secure: true,
        rejectUnauthorized: false,
        upgrade: false,
        rememberUpgrade: false
      });
      this.socket = socket;
 
      socket.on('connect', () => {
        logger.debug('Socket connected', { socketId: socket?.id });
        // Only join the currently active conversation room after (re)connect
        try {
          const state = store.getState();
          const activeConversationId = (state.conversation as { activeConversationId?: string })?.activeConversationId;
          if (activeConversationId) {
            this.joinConversationRoom(activeConversationId);
          }
        } catch (e) {
          logger.error('Error joining active room', e);
        }
      });
      
      socket.on('disconnect', () => {
        logger.debug('Socket disconnected', { socketId: socket?.id });
      });
      
      // Listen for new conversations (always a single conversation object)
      socket.on('conversation:new', (data: Conversation) => {
        this.notifyConversationListeners(data);
      });
      
      // Listen for notification:new events for badge/unread updates
      socket.on('notification:new', ({ conversation_id, message }: { conversation_id: string; message: Message }) => {
        logger.debug('Received notification event', { conversation_id });
        
        // Robust notification id fallback: prefer message.id, else message._id, else conversation_id+timestamp
        let notifId: string;
        if (message && message.id) {
          notifId = String(message.id);
        } else if (message && message._id) {
          notifId = String(message._id);
        } else {
          notifId = `${conversation_id}_${Date.now()}`;
        }
        
        // Debug log
        const state = store.getState();
        logger.debug('Processing notification', { conversation_id, notifId });
        const notifications = (state.notification as { notifications?: Array<{ id: string | number }> })?.notifications || [];
        logger.debug('Current notification IDs', { count: notifications.length });
        
        // Prevent duplicate notifications (by id)
        const existing = notifications.find(n => String(n.id) === notifId);
        if (!existing) {
          store.dispatch(addNotification({
            id: notifId,
            conversationId: conversation_id,
            content: message?.content,
            senderName: message?.sender_name || message?.senderName,
            timestamp: message?.created_at || message?.timestamp || Date.now(),
          }));
          logger.debug('Notification dispatched', { notifId });
        } else {
          logger.debug('Duplicate notification ignored', { notifId });
        }
      });
      
      // Log errors (keep error logs)
      socket.on('error', (err: Error) => {
        logger.error('Socket error', err);
      });
      
      // Test notification handler for development
      socket.on('test:notification', (data: { conversation_id?: string; message?: Message }) => {
        logger.debug('Received test notification', { hasConversationId: !!data?.conversation_id });
        // Handle test notification the same way as regular notification:new
        const { conversation_id, message } = data;
        if (conversation_id && message) {
          const notifId = `${conversation_id}_${message.id || Date.now()}`;
          const state = store.getState();
          const notifications = (state.notification as { notifications?: Array<{ id: string | number }> })?.notifications || [];
          const existing = notifications.find(n => String(n.id) === notifId);
          if (!existing) {
            store.dispatch(addNotification({
              id: notifId,
              conversationId: conversation_id,
              content: message.content || 'Test notification',
              senderName: message.sender_name || 'Test User',
              timestamp: message.created_at || Date.now(),
            }));
            logger.debug('Created test notification', { notifId });
          }
        }
      });
    }
  }

  // Join a single conversation room (corrected: pass only the conversationId)
  joinConversationRoom(conversationId: string): void {
    logger.debug('Joining room', { conversationId });
    if (socket) {
      socket.emit('join', conversationId);
    }
  }

  // Removed joinConversationRooms: joining multiple rooms is no longer supported. Only join the active room

  notifyMessageListeners(conversationId: string, msg: Message): void {
    this.messageListeners.get(conversationId)?.forEach(callback => callback(msg));
  }

  subscribeToConversations(callback: ConversationListener): () => void {
    this.conversationListeners.add(callback);
    return () => {
      this.conversationListeners.delete(callback);
    };
  }

  // Leave a single conversation room
  leaveConversationRoom(conversationId: string): void {
    logger.debug('Leaving room', { conversationId });
    if (socket && conversationId) {
      socket.emit('leave', conversationId);
    }
  }

  notifyConversationListeners(data: Conversation): void {
    this.conversationListeners.forEach(callback => callback(data));
  }

  async getConversations(): Promise<Conversation[]> {
    try {
      // Use the old working endpoint until the new role-based endpoint is fixed
      const response = await fetch(getApiUrl('/api/conversations'), {
        ...defaultFetchOptions(),
        headers: {
          ...defaultFetchOptions().headers,
          'Authorization': `Bearer ${safeStorage.getItem('token') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      logger.debug('Conversations fetched', { count: (data as Conversation[])?.length || 0 });
      return data as Conversation[];
    } catch (error) {
      logger.error('Error fetching conversations', error);
      throw error;
    }
  }

  async getConversation(id: string): Promise<Conversation> {
    try {
      const response = await fetch(getApiUrl(`/api/conversations/${id}`), {
        ...defaultFetchOptions(),
        headers: {
          ...defaultFetchOptions().headers,
          'Authorization': `Bearer ${safeStorage.getItem('token') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }

      return await response.json();
    } catch (error) {
      logger.error('Error fetching conversation', error);
      throw error;
    }
  }

  async sendChannelMessage({ channel, phone_number, message_text, conversation_id, lead_id, human_agent_id, role }: SendChannelMessageParams): Promise<unknown> {
    const response = await fetch(`${API_BASE_URL}/api/chat/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, phone_number, message_text, conversation_id, lead_id, human_agent_id, role })
    });
    if (!response.ok) {
      throw new Error('Failed to send channel message');
    }
    if (response.headers.get('content-length') === '0' || response.status === 204) {
      return null;
    }
    return response.json();
  }

  async sendMessage(conversationId: string, message: string, currentUser: CurrentUser = { name: 'Agent' }, role = 'user'): Promise<Message> {
    try {
      // Always set message_status to 'sent' if sender is current user
      const payload = {
        conversationId: conversationId,
        human_agent_id: currentUser.id,
        role: role,
        content: message,
        type: 'text',
        metadata: {
          tags: [],
          read_receipt: false,
          delivery_status: 'sent',
        },
        message_status: 'sent',
      };
      const response = await fetch(getApiUrl(`/api/chat`), {
        ...defaultFetchOptions(),
        method: 'POST',
        headers: {
          ...defaultFetchOptions().headers,
          'Authorization': `Bearer ${safeStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const newMessage = await response.json() as Message;
      this.notifyMessageListeners(conversationId, newMessage);
      // Emit message:new for local echo with required fields
      if (socket && newMessage) {
        // Force message_status to 'sent' for outgoing messages from current user
        socket.emit('message:new', {
          ...newMessage,
          human_agent_id: currentUser.id,
          message_status: 'sent',
          delivery_status: (newMessage.metadata && newMessage.metadata.delivery_status) || 'sent',
          read_receipt: (newMessage.metadata && newMessage.metadata.read_receipt) || false,
        });
      }
      return newMessage;
    } catch (error) {
      logger.error('Error sending message', error);
      throw error;
    }
  }

  async sendMessageWithAttachment(formData: FormData): Promise<unknown> {
    // formData should include: file, conversationId, sender, type, etc.
    const response = await fetch(getApiUrl('/api/messages/upload-attachment'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${safeStorage.getItem('token') || ''}`
      },
      body: formData
    });
    if (!response.ok) {
      throw new Error('Failed to upload attachment');
    }
    return await response.json();
  }

  async markAsRead(conversationId: string): Promise<unknown> {
    try {
      const response = await fetch(getApiUrl(`/api/conversations/${conversationId}/read`), {
        ...defaultFetchOptions(),
        method: 'POST',
        headers: {
          ...defaultFetchOptions().headers,
          'Authorization': `Bearer ${safeStorage.getItem('token') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to mark conversation as read');
      }

      return await response.json();
    } catch (error) {
      logger.error('Error marking conversation as read', error);
      throw error;
    }
  }

  async searchConversations(query: string): Promise<Conversation[]> {
    try {
      const response = await fetch(getApiUrl(`/api/conversations?search=${encodeURIComponent(query)}`), {
        ...defaultFetchOptions(),
        headers: {
          ...defaultFetchOptions().headers,
          'Authorization': `Bearer ${safeStorage.getItem('token') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to search conversations');
      }

      return await response.json();
    } catch (error) {
      logger.error('Error searching conversations', error);
      throw error;
    }
  }

  async getOlderMessages(conversationId: string, page = 1, limit = 20): Promise<Message[]> {
    if (!conversationId) return [];
    const params = new URLSearchParams({
      conversationId,
      page: String(page),
      limit: String(limit),
    });
    const url = getApiUrl(`/api/messages?${params.toString()}`);
    const response = await fetch(url, defaultFetchOptions());
    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }
    return await response.json();
  }

  // Get socket connection status
  getSocketStatus(): SocketStatus {
    const status: SocketStatus = {
      connected: socket?.connected || false,
      id: socket?.id || null,
      readyState: (socket as { readyState?: number })?.readyState || null,
      url: SOCKET_URL,
      timestamp: new Date().toISOString()
    };
    
    logger.debug('Socket status:', status);
    return status;
  }

  // Extract conversation activity handling logic to reuse
  handleConversationActivity(payload: ConversationActivityPayload): void {
    logger.debug('Handle conversation activity', { messageCount: payload.messages?.length });
    // Same logic as the conversation:activity event handler
    if (Array.isArray(payload.messages)) {
      logger.debug('Processing messages', { count: payload.messages.length });
      payload.messages.forEach((msg: Message) => {
        logger.debug('Processing individual message', {
          id: msg.id || msg._id,
          content: msg.content,
          senderId: msg.human_agent_id,
          senderName: msg.sender_name || msg.senderName,
          timestamp: msg.created_at || msg.timestamp,
          messageType: msg.type,
          role: msg.role
        });
        
        store.dispatch(addMessageToConversation({
          conversationId: payload.conversationId,
          message: msg,
          isActive: false
        }));
        
        // Create notification logic for real backend data
        const state = store.getState();
        const currentUserId = (state.auth as { user?: { id?: string; user?: { id?: string } } })?.user?.id || 
                              (state.auth as { user?: { user?: { id?: string } } })?.user?.user?.id;
        
        if (msg.human_agent_id && String(msg.human_agent_id) !== String(currentUserId)) {
          logger.debug('Creating notification for new message', { conversationId: payload.conversationId });
          const notifId = `${payload.conversationId}_${msg.id || msg._id || Date.now()}`;
          
          const notifications = (state.notification as { notifications?: Array<{ id: string | number }> })?.notifications || [];
          const existing = notifications.find(n => String(n.id) === notifId);
          if (!existing) {
            store.dispatch(addNotification({
              id: notifId,
              conversationId: payload.conversationId,
              content: msg.content || 'New message received',
              senderName: msg.sender_name || msg.senderName || 'Unknown User',
              timestamp: msg.created_at || msg.timestamp || Date.now(),
            }));
            logger.debug('Notification created', { notifId });
          } else {
            logger.debug('Notification already exists, skipping', { notifId });
          }
        } else {
          logger.debug('Message is from current user, no notification needed');
        }
      });
    }
    
    const updatePayload: {
      id: string;
      lastMessage?: Message;
      updatedAt?: string | number;
      unread?: number;
    } = {
      id: payload.conversationId,
      lastMessage: payload.lastMessage,
      updatedAt: payload.updatedAt,
    };
    if (typeof payload.unread === 'number') {
      updatePayload.unread = payload.unread;
    }
    store.dispatch(updateConversation(updatePayload));
  }
  
  async assignConversationHandler(conversationId: string, { handler, humanAgentId }: AssignHandlerParams): Promise<unknown> {
    try {
      const payload = { 
        handler, 
        humanAgentId: humanAgentId === null ? null : humanAgentId 
      };
      
      logger.debug('Assigning conversation handler', { conversationId, handler, humanAgentId });
      
      const response = await fetch(getApiUrl(`/api/conversations/${conversationId}/handler`), {
        ...defaultFetchOptions(),
        method: 'PATCH',
        headers: {
          ...defaultFetchOptions().headers,
          'Authorization': `Bearer ${safeStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to assign conversation handler: ${errorText}`);
      }

      const result = await response.json();
      logger.debug('Conversation handler assigned successfully', { conversationId });
      return result;
    } catch (error) {
      logger.error('Error assigning conversation handler', error);
      throw error;
    }
  }
}

const chatService = new ChatService();
export default chatService;
