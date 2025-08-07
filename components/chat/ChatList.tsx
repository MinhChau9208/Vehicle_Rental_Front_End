import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { images } from '@/constants';
import { showToast } from '../ToastAlert';
import { useAppContext } from '@/components/AppContext';
import { chatAPI } from '@/services/api';
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons
import { ClientSideChatSession } from '@/types/context';

// type ClientSideChatSession = ReturnType<typeof useAppContext>['chatSessions'][0];

const ChatList = () => {
  const router = useRouter();
  const { chatSessions, loadingChatSessions, chatSessionsError, fetchUserAndConnect } = useAppContext();
  const [refreshing, setRefreshing] = useState(false);
  const [isCreatingAiChat, setIsCreatingAiChat] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUserAndConnect();
    setRefreshing(false);
  }, [fetchUserAndConnect]);

  // Separate AI session from user sessions and sort users by last message time
  const { aiSession, userSessions } = useMemo(() => {
    const ai = chatSessions.find(session => session.receiverId === 0);
    const users = chatSessions
      .filter(session => session.receiverId !== 0)
      .sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA; // Sort descending
      });
    return { aiSession: ai, userSessions: users };
  }, [chatSessions]);

  const handleAiChatPress = async () => {
    if (isCreatingAiChat) return;
    setIsCreatingAiChat(true);
    try {
      const response = await chatAPI.createChatSessionAI();
      let sessionId: number;
      if (response.data.status === 201 || response.data.message === "Chat session already exists.") {
        sessionId = response.data.data.id;
      } else {
        throw new Error(response.data.message || 'Failed to create AI chat session');
      }
      router.push({
        pathname: '/chat/chat-detail',
        params: { sessionId: sessionId.toString(), receiverId: '0' },
      });
    } catch (err: any) {
      showToast('error', "Could not start AI chat", err.message);
    } finally {
      setIsCreatingAiChat(false);
    }
  };

  const renderSkeleton = () => (
    <View className="flex-row items-center p-4 border-b border-gray-200 bg-white animate-pulse rounded-lg mb-2 mx-4">
      <View className="w-14 h-14 rounded-full bg-gray-300 mr-4" />
      <View className="flex-1">
        <View className="h-5 bg-gray-300 rounded w-3/4 mb-2" />
        <View className="h-4 bg-gray-300 rounded w-1/2" />
      </View>
    </View>
  );

  const renderSession = ({ item, isAiChat }: { item: ClientSideChatSession, isAiChat?: boolean }) => {
    // Define conditional styles
    const containerClass = isAiChat
      ? "p-4 bg-blue-50 rounded-xl mb-3 mx-4 shadow-md border border-blue-300"
      : "p-4 bg-white rounded-xl mb-3 mx-4 shadow-sm border border-gray-200";
    
    const nicknameClass = isAiChat ? "text-base font-RobotoBold text-blue-800" : "text-base font-RobotoBold text-gray-900";

    return (
      <TouchableOpacity
        className={`flex-row items-center ${containerClass}`}
        onPress={() => {
          if (isAiChat) {
            handleAiChatPress();
          } else if (item.receiverId) {
            router.push({
              pathname: '/chat/chat-detail',
              params: { sessionId: item.sessionId.toString(), receiverId: item.receiverId.toString() }
            });
          } else {
            showToast('error', "Cannot Open Chat", "User information is missing.");
          }
        }}
        disabled={isCreatingAiChat && isAiChat}
      >
        <Image
          source={item.receiverAvatar ? { uri: item.receiverAvatar } : images.avatar}
          className="w-14 h-14 rounded-full mr-4 border-2 border-white"
        />
        <View className="flex-1">
          <View className="flex-row justify-between items-center mb-1">
            <Text className={nicknameClass}>{item.nickname}</Text>
            {item.lastMessageTime && !isAiChat && (
              <Text className="text-xs text-gray-500 font-RobotoRegular">
                {new Date(item.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
          <Text className="text-sm text-gray-600 font-RobotoRegular" numberOfLines={1}>
            {isCreatingAiChat && isAiChat ? 'Starting chat...' : (item.lastMessage || 'No messages yet')}
          </Text>
        </View>
        {isAiChat && (
          <View className="absolute top-3 right-3 bg-blue-500 p-1 rounded-full">
            <Ionicons name="sparkles" size={14} color="white" />
          </View>
        )}
        {isCreatingAiChat && isAiChat && <ActivityIndicator className="ml-2" size="small" color="#2563EB" />}
      </TouchableOpacity>
    );
  };

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
      data={userSessions}
      renderItem={({ item }) => renderSession({ item, isAiChat: false })}
      keyExtractor={(item) => item._clientId}
      contentContainerStyle={{ paddingTop: 12, paddingBottom: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
      ListHeaderComponent={
        aiSession ? () => renderSession({ item: aiSession, isAiChat: true }) : null
      }
      ListEmptyComponent={
        !aiSession ? (
          <View className="flex-1 justify-center items-center pt-10">
            <Image source={images.noResult} className="w-64 h-64" resizeMode="contain" />
            <Text className="text-2xl font-RobotoBold text-gray-800 mt-6">No Chats Found</Text>
            <Text className="text-base text-gray-500 font-RobotoRegular mt-2">Start a conversation to see it here.</Text>
          </View>
        ) : null
      }
    />
  );
};

export default ChatList;
