import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { showToast } from '../ToastAlert';
import { chatAPI } from '@/services/api';
import { images } from '@/constants';

const AiChatList = () => {
  const router = useRouter();
  const [isCreatingAiChat, setIsCreatingAiChat] = useState(false);

  const handleAiChatPress = async () => {
    setIsCreatingAiChat(true);
    try {
      const response = await chatAPI.createChatSessionAI();
      let sessionId: number;

      if (response.data.status === 201) {
        sessionId = response.data.data.id;
      } else if (response.data.message === "Chat session already exists.") {
        sessionId = response.data.data.id;
      } else {
        throw new Error(response.data.message || 'Failed to create AI chat session');
      }
      
      // Navigate to the chat detail screen with a special receiverId (0 for AI)
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

  return (
    <View className="flex-1 justify-center items-center p-4">
        <Image 
            source={images.avatar}
            className="w-40 h-40 mb-6"
            resizeMode="contain"
        />
        <Text className="text-2xl font-RobotoBold text-gray-800 text-center">AI Assistant</Text>
        <Text className="text-base text-gray-600 font-RobotoRegular mt-2 text-center mb-8">
            Have questions about rentals, policies, or need help? Start a conversation with our AI assistant.
        </Text>
        <TouchableOpacity
            onPress={handleAiChatPress}
            disabled={isCreatingAiChat}
            className="flex-row items-center justify-center p-4 bg-blue-500 rounded-xl shadow-md active:bg-blue-600 w-full"
        >
            {isCreatingAiChat ? (
            <ActivityIndicator color="#fff" />
            ) : (
            <Ionicons name="sparkles-outline" size={22} color="white" />
            )}
            <Text className="text-white text-lg font-RobotoBold ml-3">
                {isCreatingAiChat ? 'Starting Chat...' : 'Chat with AI Assistant'}
            </Text>
        </TouchableOpacity>
    </View>
  );
};

export default AiChatList;
