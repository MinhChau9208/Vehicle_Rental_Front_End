// notification.tsx
import React, { useRef, useEffect } from 'react';
import { Text, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ChatNotification, RentalNotification } from '@/types/chatData'; // Import updated types
import { useAppContext } from '@/components/AppContext'; // Assuming this context exists and manages notifications

// Extend notification types to include a client-side ID for reliable keying in FlatList.
// This is important because backend IDs might not be immediately available or might not be unique across types.
type ClientSideNotification = (ChatNotification | RentalNotification) & { _clientId: string };

const Notification = () => {
  // Consume state and functions from AppContext.
  // This context is expected to manage the global state related to notifications,
  // including fetching, marking as read, and connecting to the socket service.
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    loadingNotifications,
    notificationError,
    isPushNotificationsEnabled,
    // Assuming AppContext provides methods to connect/disconnect the socket service
    connectNotificationSocket,
    disconnectNotificationSocket,
    userId, // User ID needed for socket connection and joining rooms
    accessToken, // Access token needed for socket authentication
  } = useAppContext();

  // Create a ref for the FlatList component to enable programmatic scrolling (e.g., to the end).
  const flatListRef = useRef<FlatList<ClientSideNotification>>(null);

  // Effect hook to manage the notification socket connection.
  // It connects when userId and accessToken are available and disconnects on component unmount.
  useEffect(() => {
    if (userId && accessToken) {
      console.log('Attempting to connect notification socket...');
      connectNotificationSocket(userId, accessToken);
    }

    // Cleanup function: ensures the socket is properly disconnected when the component unmounts
    // to prevent memory leaks and unnecessary network activity.
    return () => {
      console.log('Disconnecting notification socket...');
      disconnectNotificationSocket();
    };
  }, [userId, accessToken, connectNotificationSocket, disconnectNotificationSocket]); // Dependencies for this effect

  // Effect hook to automatically scroll the FlatList to the end when new notifications arrive.
  // This provides a smoother user experience for real-time updates.
  useEffect(() => {
    if (flatListRef.current && notifications.length > 0) {
      // A small delay helps ensure that the UI has finished rendering the new items
      // before the scroll operation is attempted, preventing incomplete scrolls.
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [notifications]); // Re-run this effect whenever the 'notifications' array changes

  /**
   * Renders a single notification item for the FlatList.
   * It dynamically determines the type of notification (chat or rental)
   * and extracts relevant information from the 'event.data' payload based on the new interfaces.
   * @param item The notification item to render (ClientSideNotification).
   */
  const renderNotification = ({ item }: { item: ClientSideNotification }) => {
    // Determine if it's a chat or rental notification by checking for 'sessionId' in item.event.data.
    const isChat = item.event && 'sessionId' in item.event.data;

    let title: string;
    let details: string;
    // The main message content is now directly from item.event.message as per the backend spec.
    const messageContent: string = item.event?.message || 'No message content';

    if (isChat) {
      const chatNotif = item as ChatNotification;
      title = 'New Chat Message';
      // Safely access nested properties using optional chaining.
      details = `From: ${chatNotif.event.data?.senderName || 'Unknown'}, Session: ${chatNotif.event.data?.sessionId}`;
    } else {
      const rentalNotif = item as RentalNotification;
      // For rental notifications, the 'message' in event is already descriptive (e.g., "New rental booking requested!").
      title = rentalNotif.event.message;
      // Dynamically determine details based on whether it's a new booking or status update.
      if (rentalNotif.event.data.renterName) {
        details = `New booking by: ${rentalNotif.event.data.renterName}, Vehicle ID: ${rentalNotif.event.data.vehicleId}, Status: ${rentalNotif.event.data.rentalStatus}`;
      } else if (rentalNotif.event.data.ownerName) {
        details = `Status updated by: ${rentalNotif.event.data.ownerName}, Vehicle ID: ${rentalNotif.event.data.vehicleId}, Status: ${rentalNotif.event.data.rentalStatus}`;
      } else {
        details = `Rental ID: ${rentalNotif.event.data.rentalId}, Status: ${rentalNotif.event.data.rentalStatus}`;
      }
    }

    // Format the creation date for display.
    const createdAt = item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A';

    return (
      <View className="p-4 border-b border-gray-200 bg-white rounded-lg shadow-sm mx-2 my-1">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-base font-RobotoMedium text-gray-800">{title}</Text>
          {/* Mark as Read button: only clickable if item.id is defined. */}
          {/* Assumes markNotificationAsRead is provided by AppContext and handles the state update. */}
          <TouchableOpacity
            onPress={() => item.id !== undefined && markNotificationAsRead(item.id)}
            className="px-2 py-1 rounded-full"
            style={{ backgroundColor: item.isRead ? '#E0E0E0' : '#2563EB' }} // Dynamic background based on read status
          >
            <Text className={item.isRead ? 'text-gray-600 text-xs' : 'text-white text-xs'}>
              {item.isRead ? 'Read' : 'Mark as Read'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text className="text-sm text-gray-700 mb-1">{messageContent}</Text>
        <Text className="text-xs text-gray-500">{details}</Text>
        <Text className="text-xs text-gray-400 mt-1 self-end">{createdAt}</Text>
      </View>
    );
  };

  // --- Conditional Rendering based on loading/error states for a better user experience ---

  // Show a large activity indicator when notifications are being loaded.
  if (loadingNotifications) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="mt-4 text-gray-600">Loading notifications...</Text>
      </SafeAreaView>
    );
  }

  // Display an error message if there was an issue loading notifications.
  if (notificationError) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <Ionicons name="warning-outline" size={48} color="red" />
        <Text className="text-red-500 font-RobotoMedium mt-4 text-lg text-center px-4">
          Error loading notifications: {notificationError}
        </Text>
        <Text className="text-gray-500 mt-2">Please try again later.</Text>
      </SafeAreaView>
    );
  }

  // Inform the user if push notifications are disabled and there are no past notifications to display.
  if (!isPushNotificationsEnabled && notifications.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
        <Text className="text-center text-gray-500 font-RobotoMedium mt-4 text-lg px-4">
          Push notifications are disabled.
        </Text>
        <Text className="text-center text-gray-500 font-RobotoMedium mt-2 px-4">
          Enable them in settings to receive real-time updates.
        </Text>
        <Text className="text-center text-gray-500 font-RobotoMedium mt-2 px-4">
          No past notifications loaded.
        </Text>
      </SafeAreaView>
    );
  }

  // --- Main Notification List View ---
  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header section with back button, title, and "Mark All as Read" action. */}
      <View className="flex-row justify-between items-center px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full bg-gray-100">
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-Roboto font-bold text-gray-900">Notifications</Text>
        <TouchableOpacity onPress={markAllNotificationsAsRead} className="p-2 rounded-full bg-blue-50">
          <Text className="text-[#2563EB] font-RobotoMedium text-sm">Mark All as Read</Text>
        </TouchableOpacity>
      </View>
      {/* FlatList component to efficiently render a scrollable list of notifications. */}
      <FlatList
        ref={flatListRef} // Assign the ref for scrolling control
        data={notifications as ClientSideNotification[]} // Cast data to the extended type
        renderItem={renderNotification} // Function to render each item
        keyExtractor={(item) => item._clientId} // Use the client-side ID for guaranteed unique keys
        contentContainerStyle={{ paddingVertical: 8 }} // Add some vertical padding to the list content
        // Component to display when the notification list is empty.
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center mt-20">
            <Ionicons name="notifications-outline" size={60} color="#CBD5E0" />
            <Text className="text-center text-gray-500 font-RobotoMedium mt-4 text-lg">
              You're all caught up!
            </Text>
            <Text className="text-center text-gray-400 mt-1">
              No new notifications at the moment.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default Notification;
