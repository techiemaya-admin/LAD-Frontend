// Redux slice for global notifications (in-app, not system snackbar)
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
interface Notification {
  id: string | number;
  type?: string;
  message?: string;
  data?: unknown;
  read?: boolean;
  conversationId?: string | number;
  content?: string;
  senderName?: string;
  timestamp?: string | number;
  [key: string]: unknown;
}
interface NotificationState {
  notifications: Notification[];
  unreadCounts: Record<string | number, number>;
  totalUnread: number;
}
const initialState: NotificationState = {
  notifications: [], // { id, type, message, data, read }
  unreadCounts: {}, // { conversationId: count } for per-lead unread counts
  totalUnread: 0,   // Total unread notifications
};
const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    addNotification(state, action: PayloadAction<Notification>) {
      const notification: Notification = { ...action.payload, read: false };
      state.notifications.push(notification);
      // Update unread counts
      if (notification.conversationId) {
        state.unreadCounts[notification.conversationId] = 
          (state.unreadCounts[notification.conversationId] || 0) + 1;
        state.totalUnread += 1;
      }
    },
    setNotifications(state, action: PayloadAction<Notification[]>) {
      state.notifications = action.payload;
      // Recalculate unread counts
      state.unreadCounts = {};
      state.totalUnread = 0;
      action.payload.forEach(notif => {
        if (!notif.read && notif.conversationId) {
          state.unreadCounts[notif.conversationId] = 
            (state.unreadCounts[notif.conversationId] || 0) + 1;
          state.totalUnread += 1;
        }
      });
    },
    markNotificationRead(state, action: PayloadAction<string | number>) {
      const notif = state.notifications.find(n => n.id === action.payload);
      if (notif && !notif.read) {
        notif.read = true;
        // Update unread counts
        if (notif.conversationId) {
          state.unreadCounts[notif.conversationId] = 
            Math.max(0, (state.unreadCounts[notif.conversationId] || 0) - 1);
          state.totalUnread = Math.max(0, state.totalUnread - 1);
        }
      }
    },
    clearNotifications(state) {
      state.notifications = [];
      state.unreadCounts = {};
      state.totalUnread = 0;
    },
    removeNotification(state, action: PayloadAction<string | number>) {
      const notif = state.notifications.find(n => n.id === action.payload);
      if (notif && !notif.read) {
        // Update unread counts before removing
        if (notif.conversationId) {
          state.unreadCounts[notif.conversationId] = 
            Math.max(0, (state.unreadCounts[notif.conversationId] || 0) - 1);
          state.totalUnread = Math.max(0, state.totalUnread - 1);
        }
      }
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    // New: Mark all notifications for a conversation as read
    markConversationAsRead(state, action: PayloadAction<string | number>) {
      const conversationId = action.payload;
      state.notifications.forEach(notif => {
        if (notif.conversationId === conversationId && !notif.read) {
          notif.read = true;
        }
      });
      // Update unread counts
      if (state.unreadCounts[conversationId]) {
        state.totalUnread = Math.max(0, state.totalUnread - state.unreadCounts[conversationId]);
        state.unreadCounts[conversationId] = 0;
      }
    }
  }
});
export const { 
  addNotification, 
  setNotifications, 
  markNotificationRead, 
  clearNotifications, 
  removeNotification,
  markConversationAsRead
} = notificationSlice.actions;
export const selectNotifications = (state: { notification: NotificationState }): Notification[] => state.notification.notifications;
export const selectUnreadCounts = (state: { notification: NotificationState }): Record<string | number, number> => state.notification.unreadCounts;
export const selectTotalUnread = (state: { notification: NotificationState }): number => state.notification.totalUnread;
export default notificationSlice.reducer;