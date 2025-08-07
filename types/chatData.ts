export interface VehicleContent {
  id: number;
  userId: number;
  title: string;
  imageFront: string;
  price: number;
  // Add other vehicle properties if needed
}

// Represents the content of a rental confirmation message
export interface RentalConfirmationContent {
  vehicleId: number;
  startDateTime: string;
  endDateTime: string;
  totalDays: number;
  dailyPrice: number;
  totalPrice: number;
  depositPrice: number;
  // Add any other relevant fields from the payload
  // We'll also need vehicle details to navigate properly
  vehicle?: {
    title: string;
    imageFront: string;
  };
  owner?: {
    nickname: string;
    avatar?: string;
  };
  rating?: number;
}

// Represents a chat message
export interface ChatMessage {
  id: number;
  senderId: number;
  type: 'text' | 'image' | 'vehicle' | 'rental-confirmation';
  content: string | VehicleContent[] | RentalConfirmationContent;
  createdAt: string;
  senderName?: string;
  senderAvatar?: string;
}

export interface ChatSessionData {
  content: string | VehicleContent[] | RentalConfirmationContent;
  createdAt: string;
  type: 'text' | 'image' | 'vehicle' | 'rental-confirmation';
}

export interface ChatSession {
  sessionId: number;
  // data: {
  //   senderId: number;
  //   type: string;
  //   content: string;
  //   createdAt: string;
  //   senderName: string;
  //   senderAvatar: string;
  // } | null;
  receivers: {
    receiverId: number;
    receiverName: string;
    receiverAvatar: string | null;
  }[];
  data?: ChatSessionData
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
