import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { authAPI, chatAPI } from '@/services/api';
import { socketService } from '@/services/socketService';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '@/components/ToastAlert';

const users = [
  { id: 1, nickname: 'User 1' },
  { id: 2, nickname: 'User 2' },
  { id: 3, nickname: 'User 3' },
];

const NewChat = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSelectUser = async (receiverId: number) => {
    setLoading(true);
    try {
      const userResponse = await authAPI.getUser(); // Fetch current user ID
      if (userResponse.status === 200 && userResponse.data?.data) {
        const senderId = userResponse.data.data.id;
        console.log('receiverId:', receiverId);
        const response = await chatAPI.createChatSession([receiverId]);
        console.log('status:', response.data.status);
        console.log('Create chat session response:', response.data.data);
        if (response.data.status === 201) {
          const sessionId = response.data.data.id;

          // Connect to WebSocket for this session
          const accessToken = await AsyncStorage.getItem('accessToken');
          // FIX: Use connectChat and joinSession
          await socketService.connectChat(senderId, accessToken);
          await socketService.joinSession(sessionId);
          router.push({ pathname: '/chat/chat-detail', params: { sessionId: sessionId.toString(), receiverId: receiverId.toString() } });
        } else {
          if (response.data.status === 200) {
            showToast('error', 'Chat session already exists with this user');
            router.push({ pathname: '/chat/chat-detail', params: { sessionId: response.data.data.id.toString(), receiverId: receiverId.toString() } });
          }
          showToast('error', response.data.message || 'Failed to create chat session');
        }
      }
    } catch (error: any) {
      console.error('Error creating chat session:', error.response?.data.errorCode);
      showToast('error', error.response?.data?.message || 'Failed to create chat session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white p-4">
      <FlatList
        data={users}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="p-4 border-b border-gray-200"
            onPress={() => handleSelectUser(item.id)}
            disabled={loading}
          >
            <Text className="text-lg">{item.nickname}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
};

export default NewChat;