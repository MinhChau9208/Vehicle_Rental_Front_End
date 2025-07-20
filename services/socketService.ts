// services/socketService.ts
import { io, Socket } from 'socket.io-client';
import { ChatMessage, ChatNotification, RentalNotification, ChatSession } from '@/types/chatData';

const BASE_URL = 'https://vehicle.kietpep1303.com';

class SocketService {
  private notificationSocket: Socket | null = null;
  private chatSocket: Socket | null = null;

  private notificationListeners: Map<string, Function> = new Map();
  private chatListeners: Map<string, Function> = new Map();

  // --- Notification Socket Methods ---

  public connectNotification(userId: number, accessToken: string): void {
    if (this.notificationSocket?.connected) return;
    this.disconnectNotification(); // Ensure clean slate

    this.notificationSocket = io(`${BASE_URL}/notifications`, {
      auth: { accessToken },
      transports: ['websocket'],
    });

    this.notificationSocket.on('connect', () => {
      console.log('✅ Notification socket connected:', this.notificationSocket?.id);
      // Re-apply any listeners that were registered before connection
      this.notificationListeners.forEach((callback, event) => {
        this.notificationSocket?.on(event, callback as any);
      });
      // Emit joinRoom automatically on successful connection
      this.notificationSocket?.emit('joinRoom', { userId });
      console.log(`🚀 Emitted joinRoom for user_${userId}`);
    });

    this.notificationSocket.on('disconnect', (reason) => {
      console.log('Notification socket disconnected:', reason);
    });

    this.notificationSocket.on('connect_error', (error) => {
      console.error('❌ Notification socket connection error:', error.message);
    });
  }

  public disconnectNotification(): void {
    this.notificationSocket?.disconnect();
    this.notificationSocket = null;
  }

  // --- Chat Socket Methods (MAJOR FIX HERE) ---

  public connectChat(userId: number, accessToken: string): void {
    if (this.chatSocket?.connected) return;
    this.disconnectChat(); // Ensure clean slate

    this.chatSocket = io(`${BASE_URL}/chat`, {
      auth: { accessToken },
      transports: ['websocket'],
    });

    this.chatSocket.on('connect', () => {
      console.log('✅ Chat socket connected:', this.chatSocket?.id);
      // Re-apply any listeners that were registered before connection
      this.chatListeners.forEach((callback, event) => {
        this.chatSocket?.on(event, callback as any);
      });
      // --- THE FIX ---
      // Automatically emit joinChatList as soon as the connection is established.
      // This removes the race condition.
      this.joinChatList(userId);
    });

    this.chatSocket.on('disconnect', (reason) => {
      console.log('Chat socket disconnected:', reason);
    });

    this.chatSocket.on('connect_error', (error) => {
      console.error('❌ Chat socket connection error:', error.message);
    });
  }

  public disconnectChat(): void {
    this.chatSocket?.disconnect();
    this.chatSocket = null;
  }
  
  // --- Listener Registration Methods ---

  // These methods now just store the callback. The 'connect' handler applies them.
  public onRentalNotification(callback: (notification: RentalNotification) => void): void {
    this.notificationListeners.set('rentalNotification', callback);
    this.notificationSocket?.on('rentalNotification', callback); // Also apply if already connected
  }

  public onMessageNotification(callback: (notification: ChatNotification) => void): void {
    this.notificationListeners.set('messageNotification', callback);
    this.notificationSocket?.on('messageNotification', callback);
  }

  public onChatListMessage(callback: (data: { sessions: ChatSession[] }) => void): void {
    this.chatListeners.set('chatListMessage', callback);
    this.chatSocket?.on('chatListMessage', callback);
  }

  public onChatListMessageUpdate(callback: (data: any) => void): void {
    this.chatListeners.set('chatListMessageUpdate', callback);
    this.chatSocket?.on('chatListMessageUpdate', callback);
  }
  
  // --- NEW: Chat Detail Screen Listeners ---
  // These were missing and are now added back.

  /**
   * Listens for the initial batch of messages when joining a specific chat session.
   * @param callback The function to execute with the message history.
   */
  public onChatSessionMessage(callback: (data: { sessionId: number; messages: ChatMessage[] }) => void): void {
    const eventName = 'chatSessionMessage';
    this.chatListeners.set(eventName, callback);
    this.chatSocket?.on(eventName, callback as any); // Apply if socket is already connected
    console.log(`Registered listener for ${eventName}`);
  }

  /**
   * Listens for new, individual messages arriving in the current chat session.
   * @param callback The function to execute with the new message.
   */
  public onChatSessionMessageUpdate(callback: (data: { sessionId: number; data: ChatMessage }) => void): void {
    const eventName = 'chatSessionMessageUpdate';
    this.chatListeners.set(eventName, callback);
    this.chatSocket?.on(eventName, callback as any); // Apply if socket is already connected
    console.log(`Registered listener for ${eventName}`);
  }

  // --- Emit Methods ---
  
  public joinSession(sessionId: number, page?: number, limit?: number): void {
    if (this.chatSocket?.connected) {
      // Create payload object and only include page/limit if they are provided
      const payload: { sessionId: number; page?: number; limit?: number } = { sessionId };
      if (page) payload.page = page;
      if (limit) payload.limit = limit;
      
      this.chatSocket.emit('joinSession', payload);
      console.log(`🚀 Emitted joinSession for session_${sessionId} with payload:`, payload);
    } else {
      console.error('Cannot join session, chat socket not connected.');
    }
  }

  private joinChatList(userId: number, page?: number, limit?: number): void {
    if (this.chatSocket?.connected) {
      // Create payload object and only include page/limit if they are provided
      const payload: { userId: number; page?: number; limit?: number } = { userId };
      if (page) payload.page = page;
      if (limit) payload.limit = limit;

      this.chatSocket.emit('joinChatList', payload);
      console.log(`🚀 Emitted joinChatList for user_${userId} with payload:`, payload);
    }
  }

  // Central `off` method
  public off(event: string): void {
    this.notificationListeners.delete(event);
    this.notificationSocket?.off(event);
    
    this.chatListeners.delete(event);
    this.chatSocket?.off(event);
  }
}

export const socketService = new SocketService();