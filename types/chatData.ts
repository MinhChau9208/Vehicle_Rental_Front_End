// chatData.ts
export interface ChatMessage {
  id: string;
  fromUserId: number;
  toUserId: number;
  message: string;
  createdAt: string;
}

export interface ChatSession {
  sessionId: number;
  data: {
    senderId: number;
    type: string;
    content: string;
    createdAt: string;
    senderName: string;
    senderAvatar: string;
  } | null;
  receivers: {
    receiverId: number;
    receiverName: string;
    receiverAvatar: string | null;
  }[];
  total?: number;
  currentPage?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

/**
 * Interface for chat notifications received from the backend.
 * Reflects the payload structure for 'messageNotification' event.
 */
export interface ChatNotification {
  id: number; // Notification ID
  userId: number; // User’s ID
  event: {
    message: string; // E.g., "New message received!"
    data: {
      sessionId: number; // Chat session’s ID
      senderId: number;
      type: string; // Type of message (e.g., 'text', 'image')
      content: string; // The actual message content
      createdAt: string; // Timestamp of the message
      senderName: string;
      senderAvatar: string;
    };
  };
  createdAt: string; // Timestamp of when the notification was created/sent
  isRead?: boolean; // Client-side flag to track read status
}

/**
 * Interface for rental notifications received from the backend.
 * Reflects the payload structure for 'rentalNotification' event.
 */
export interface RentalNotification {
  id: number; // Notification ID
  userId: number; // User’s ID
  event: {
    message: string; // E.g., "New rental booking requested!" or "New rental status updated!"
    data: {
      vehicleId: number;
      rentalId: number;
      rentalStatus: string; // Current status of the rental (enum)
      renterName?: string; // Present for new booking requests
      renterAvatar?: string; // Present for new booking requests
      ownerName?: string; // Present for rental status updates
      ownerAvatar?: string; // Present for rental status updates
    };
  };
  createdAt: string; // Timestamp of when the notification was created/sent
  isRead?: boolean; // Client-side flag to track read status
}

export interface Conversation {
  userId: number;
  nickname: string;
  avatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}
