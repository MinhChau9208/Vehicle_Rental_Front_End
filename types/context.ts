import { ChatNotification, RentalNotification, ChatSession } from './chatData';

/**
 * Defines the shape of the currently logged-in user object.
 */
export interface CurrentUser {
  id: number;
  email: string;
  nickname: string;
  level: number;
  // Add any other fields that come from your authAPI.getUser() response
  [key: string]: any; 
}

/**
 * Represents a notification on the client-side, adding a unique ID and read status.
 */
export type ClientSideNotification = (ChatNotification | RentalNotification) & {
  _clientId: string;
  isRead: boolean;
};

/**
 * Represents a chat session object as used within the client.
 * This is a simplified/transformed version of the `ChatSession` from the API,
 * tailored for the UI.
 */
export interface ClientSideChatSession {
  _clientId: string;
  sessionId: number;
  receiverId: number | null;
  nickname: string;
  receiverAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string | null;
  unreadCount: number;
}

/**
 * Defines the complete shape of the application's global context.
 */
export interface AppContextType {
  currentUser: CurrentUser | null;
  isLoadingUser: boolean;
  logout: () => void;
  fetchUserAndConnect: () => Promise<void>;
  notifications: ClientSideNotification[];
  markNotificationAsRead: (notificationId: number) => void;
  markAllNotificationsAsRead: () => void;
  chatSessions: ClientSideChatSession[];
  loadingChatSessions: boolean;
  chatSessionsError: string | null;
  activeChatSessionId: number | null;
  setActiveChatSessionId: (sessionId: number | null) => void;
}
