import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { images } from '@/constants';
import { showToast } from '../ToastAlert';
import { useAppContext } from '@/components/AppContext';

type ClientSideChatSession = ReturnType<typeof useAppContext>['chatSessions'][0];

const ChatList = () => {
  const router = useRouter();
  const { chatSessions, loadingChatSessions, chatSessionsError, fetchUserAndConnect } = useAppContext();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUserAndConnect();
    setRefreshing(false);
  }, [fetchUserAndConnect]);

  const renderSkeleton = () => (
    <View className="flex-row items-center p-4 border-b border-gray-200 bg-white animate-pulse rounded-lg mb-2 mx-4">
      <View className="w-14 h-14 rounded-full bg-gray-300 mr-4" />
      <View className="flex-1">
        <View className="h-5 bg-gray-300 rounded w-3/4 mb-2" />
        <View className="h-4 bg-gray-300 rounded w-1/2" />
      </View>
    </View>
  );

  const renderSession = ({ item }: { item: ClientSideChatSession }) => (
    <TouchableOpacity
      className="flex-row items-center p-4 bg-white rounded-xl mb-3 mx-4 shadow-sm border border-gray-200"
      onPress={() => {
        if (item.receiverId) {
          router.push({
            pathname: '/chat/chat-detail',
            params: { 
              sessionId: item.sessionId.toString(), 
              receiverId: item.receiverId.toString()
            }
          });
        } else {
          showToast('error', "Cannot Open Chat", "User information is missing.");
        }
      }}
    >
      <Image
        source={item.receiverAvatar ? { uri: item.receiverAvatar } : images.avatar}
        className="w-14 h-14 rounded-full mr-4 border border-gray-200"
      />
      <View className="flex-1">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-base font-RobotoBold text-gray-900">{item.nickname}</Text>
          <Text className="text-xs text-gray-500 font-RobotoRegular">
            {item.lastMessageTime ? new Date(item.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </View>
        <Text className="text-sm text-gray-600 font-RobotoRegular" numberOfLines={1}>
          {item.lastMessage || 'No messages yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loadingChatSessions) {
    return (
      <FlatList
        data={Array(5).fill(null)}
        renderItem={renderSkeleton}
        keyExtractor={(item, index) => `skeleton-${index}`}
        contentContainerStyle={{ paddingTop: 12 }}
      />
    );
  }

  if (chatSessionsError) {
    return (
      <View className="flex-1 justify-center items-center p-5">
        <Text className="text-red-500 font-RobotoBold text-lg text-center">{chatSessionsError}</Text>
        <TouchableOpacity onPress={onRefresh} className="mt-4 bg-[#2563EB] py-3 px-6 rounded-md">
          <Text className="text-white font-RobotoMedium">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={chatSessions}
      renderItem={renderSession}
      keyExtractor={(item) => item._clientId}
      contentContainerStyle={{ paddingTop: 12 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
      }
      ListEmptyComponent={
        <View className="flex-1 justify-center items-center pt-10">
          <Image source={images.noResult} className="w-64 h-64" resizeMode="contain" />
          <Text className="text-2xl font-RobotoBold text-gray-800 mt-6">No Chats Found</Text>
        </View>
      }
    />
  );
};

export default ChatList;
