import React from 'react';
import { Text, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '@/components/AppContext';
import { notificationAPI } from '@/services/api';
import { router } from 'expo-router';
import { showToast } from '@/components/ToastAlert';

type ClientSideNotification = ReturnType<typeof useAppContext>['notifications'][0];

const Notification = () => {
  const {
    notifications,
    markNotificationAsRead,
    isLoadingUser,
  } = useAppContext();

  const renderNotification = ({ item }: { item: ClientSideNotification }) => {
    const isChat = item.event && 'sessionId' in item.event.data;
    const messageContent: string = item.event?.message || 'No message content';

    let title: string = 'System Notification';
    let details: string = 'No details available.';

    if (isChat) {
      const chatData = item.event.data;
      title = `New Message from ${chatData.senderName || 'a user'}`;
      // Display the message content, or a placeholder for images
      details = chatData.type === 'image' 
        ? 'Sent an image.' 
        : `"${chatData.content}"`;
    } else { // This is a rental notification
      const rentalData = item.event.data;
      title = `Rental Update`;
      // Provide details about the specific rental
      details = `Rental #${rentalData.rentalId} for Vehicle #${rentalData.vehicleId} is now ${rentalData.rentalStatus}.`;
    }
    

    const createdAt = item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A';
    
    // This handler will navigate to the correct screen based on the notification type
    const handlePress = async () => {
      // Mark as read when pressed
      if (!item.isRead) {
        markNotificationAsRead(item.id);
        
        // 2. Call the API to mark as read on the server.
        try {
          await notificationAPI.setAsRead(item.id);
        } catch (error) {
          console.error('Failed to mark notification as read on server:', error);
          showToast('error', 'Could not sync read status with server.');
          // Note: The UI will remain "read". No revert logic is implemented for simplicity.
        }
      }

      if (isChat) {
        router.push('/chat'); // Or router.push({ pathname: '/chat/chat-detail', params: { ... } });
      } else {
        // Navigate to the rental details screen
        router.push({ pathname: '/rental/rental-details', params: { rentalId: item.event.data.rentalId } });
      }
    };

    return (
      <TouchableOpacity onPress={handlePress} className="p-4 border-b border-gray-200 bg-white rounded-lg shadow-sm mx-2 my-1 active:bg-gray-100">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-base font-RobotoMedium text-gray-800 flex-1" numberOfLines={1}>{title}</Text>
          {!item.isRead && <View className="w-2.5 h-2.5 bg-blue-500 rounded-full ml-2" />}
        </View>
        <Text className="text-sm text-gray-700 mb-1">{messageContent}</Text>
        <Text className="text-sm text-gray-500 font-RobotoRegular" numberOfLines={2}>{details}</Text>
        <Text className="text-xs text-gray-400 mt-2 self-end">{createdAt}</Text>
      </TouchableOpacity>
    );
  };

  if (isLoadingUser) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="mt-4 text-gray-600">Loading user data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <View className="p-4 bg-white border-b border-gray-200">
        <Text className="text-2xl font-RobotoBold text-center text-gray-900">Notifications</Text>
      </View>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item._clientId}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 8 }}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center mt-20">
            <Ionicons name="notifications-outline" size={60} color="#CBD5E0" />
            <Text className="text-center text-gray-500 font-RobotoMedium mt-4 text-lg">
              You're all caught up!
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default Notification;