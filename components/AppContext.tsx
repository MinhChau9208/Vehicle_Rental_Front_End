import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from '@/services/socketService';
import { authAPI, notificationAPI } from '@/services/api';
import { 
  ChatNotification, 
  RentalNotification, 
  ChatSession, 
  ChatSessionData,
  VehicleContent,
  RentalConfirmationContent 
} from '@/types/chatData';
import { showToast } from './ToastAlert';
import { router } from 'expo-router';
import {
  AppContextType,
  ClientSideChatSession,
  ClientSideNotification,
  CurrentUser,
} from '@/types/context';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // User State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  
  // Notification State
  const [notifications, setNotifications] = useState<ClientSideNotification[]>([]);
  
  // Chat State
  const [chatSessions, setChatSessions] = useState<ClientSideChatSession[]>([]);
  const [loadingChatSessions, setLoadingChatSessions] = useState<boolean>(true);
  const [chatSessionsError, setChatSessionsError] = useState<string | null>(null);
  const [activeChatSessionId, setActiveChatSessionId] = useState<number | null>(null);


  const logout = useCallback(async () => {
    await AsyncStorage.clear();
    setCurrentUser(null);
    setNotifications([]);
    setChatSessions([]);
    socketService.disconnectNotification();
    socketService.disconnectChat();
  }, []);

  // 1. This function is now only for connecting/disconnecting
  const fetchUserAndConnect = useCallback(async () => {
    setIsLoadingUser(true);
    socketService.disconnectNotification();
    socketService.disconnectChat();

    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        const userResponse = await authAPI.getUser();
        const user = userResponse.data?.data;

        if (userResponse.data?.status === 200 && user) {
          setCurrentUser(user);
          const freshToken = await AsyncStorage.getItem('accessToken');
          if (freshToken) {
            socketService.connectNotification(user.id, freshToken);
            socketService.connectChat(user.id, freshToken);
          } else {
            await logout();
          }
        } else {
          await logout();
        }
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user or connect sockets:', error);
      await logout();
    } finally {
      setIsLoadingUser(false);
    }
  }, [logout]);

  

  // Run connection logic on app start
  useEffect(() => {
    fetchUserAndConnect();
  }, []);

  useEffect(() => {
    // Only set up listeners if there is a logged-in user.
    if (currentUser) {
      console.log('✅ User session active. Setting up listeners...');

      // --- Define Handlers ---

      const handleRentalNotification = (newNotification: RentalNotification) => {
        // Show a toast for the new rental notification
        const rentalData = newNotification.event.data;
        
        // Determine if the current user is the renter or the owner for this notification
        const isRenter = currentUser.id === rentalData.renterId;
        
        const handleToastPress = () => {
          if (isRenter) {
            // Renters go to their rental history
            router.push('/history');
          } else {
            // Owners go to the specific vehicle's rental list
            router.push({
              pathname: '/user/vehicle-rentals',
              params: { vehicleId: rentalData.vehicleId }
            });
          }
        };
        
        // Show a pressable toast
        showToast(
          'info',
          'Rental Update',
          `Tap to view details for rental #${rentalData.rentalId}.`,
          handleToastPress // Pass the navigation function here
        );

        setNotifications(prev =>
          // Prevent duplicates and add to the top of the list
          prev.some(n => n.id === newNotification.id)
            ? prev
            : [{ ...newNotification, _clientId: uuidv4(), isRead: newNotification.isRead || false }, ...prev]
        );
      };

      const handleMessageNotification = (newNotification: ChatNotification) => {
        // Show a toast for the new message notification
        const chatData = newNotification.event.data;

        // Suppress notification if user is in the specific chat
        if (chatData.sessionId === activeChatSessionId) {
          console.log(`Notification suppressed for active chat session: ${activeChatSessionId}`);
          return;
        }

        // Define the navigation action for chat notifications
        const handleToastPress = () => {
          router.push({
            pathname: '/chat/chat-detail',
            params: { sessionId: chatData.sessionId, receiverId: chatData.senderId },
          });
        };

        const message = chatData.type === 'image' ? 'Sent an image.' : `"${chatData.content}"`;
        showToast(
          'info', 
          `New Message from ${chatData.senderName || 'a user'}`, 
          "Tap to view details for this message.",
          handleToastPress // Pass the navigation function here
        );
        setNotifications(prev =>
          prev.some(n => n.id === newNotification.id)
            ? prev
            : [{ ...newNotification, _clientId: uuidv4(), isRead: newNotification.isRead || false }, ...prev]
        );
      };

      const handleChatListMessage = (data: { sessions: ChatSession[] }) => {
        // console.log('Received initial chat list:', JSON.stringify(data, null, 2));
        const sessions = data.sessions.map(session => {
          const mainReceiver = session.receivers?.[0] || null;

          let lastMessageText = 'No messages yet';
          if (session.data) {
              switch (session.data.type) {
                  case 'image':
                      lastMessageText = 'Sent an image.';
                      break;
                  case 'vehicle':
                      lastMessageText = 'Sent a vehicle suggestion.';
                      break;
                  case 'rental-confirmation':
                      lastMessageText = 'Sent a rental confirmation.';
                      break;
                  case 'text':
                  default:
                      lastMessageText = session.data.content as string;
                      break;
              }
          }
          return {
            sessionId: session.sessionId,
            receiverId: mainReceiver?.receiverId ?? null,
            nickname: mainReceiver?.receiverName ?? 'New Conversation',
            receiverAvatar: mainReceiver?.receiverAvatar ?? null,
            lastMessage: lastMessageText,
            lastMessageTime: session.data?.createdAt ?? null,
            unreadCount: 0,
            _clientId: uuidv4(),
          };
        });
        setChatSessions(sessions);
        setLoadingChatSessions(false);
      };

      const handleChatListMessageUpdate = (update: { sessionId: number; data: ChatSessionData }) => {
        console.log('Received chat list update:', update);
        setChatSessions(prevSessions => {
          const updatedSession = prevSessions.find(s => s.sessionId === update.sessionId);

          if (updatedSession) {
            let lastMessageText = '';
            switch (update.data.type) {
              case 'image':
                lastMessageText = 'Sent an image.';
                break;
              case 'vehicle':
                lastMessageText = 'Sent a vehicle suggestion.';
                break;
              case 'rental-confirmation':
                lastMessageText = 'Sent a rental confirmation.';
                break;
              case 'text':
              default:
                // Ensure content is a string before assigning
                lastMessageText = typeof update.data.content === 'string' 
                    ? update.data.content 
                    : 'Received a new message.';
                break;
            }

            // Update the existing session's details
            updatedSession.lastMessage = lastMessageText;
            updatedSession.lastMessageTime = update.data.createdAt;

            // Filter out the old version and move the updated one to the top
            const otherSessions = prevSessions.filter(s => s.sessionId !== update.sessionId);
            return [updatedSession, ...otherSessions];
          }

          // If for some reason the session is not found, return the previous state
          return prevSessions;
        });
      };

      // --- Register Listeners with the Service ---
      socketService.onRentalNotification(handleRentalNotification);
      socketService.onMessageNotification(handleMessageNotification);
      socketService.onChatListMessage(handleChatListMessage);
      socketService.onChatListMessageUpdate(handleChatListMessageUpdate);

      // --- Cleanup Listeners ---
      return () => {
        console.log('User changed or logged out. Removing listeners.');
        socketService.off('rentalNotification');
        socketService.off('messageNotification');
        socketService.off('chatListMessage');
        socketService.off('chatListMessageUpdate');
      };
    }
  }, [currentUser, activeChatSessionId]); // This effect re-runs ONLY when the user logs in or out

  const markNotificationAsRead = useCallback((notificationId: number) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const contextValue: AppContextType = {
    currentUser,
    isLoadingUser,
    logout,

    notifications,
    fetchUserAndConnect,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    
    chatSessions,
    loadingChatSessions,
    chatSessionsError,
    
    activeChatSessionId,
    setActiveChatSessionId,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};