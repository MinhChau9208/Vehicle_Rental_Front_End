import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChatList from '@/components/chat/ChatList';
import AiChatList from '@/components/chat/AiChatList';
import { useRouter } from 'expo-router';
import { chatAPI } from '@/services/api';
import { showToast } from '@/components/ToastAlert';

const Chat = () => {
  const [activeTab, setActiveTab] = useState<'messages' | 'ai'>('messages');
  const [isCreatingAiChat, setIsCreatingAiChat] = useState(false);
  const router = useRouter();

  const handleStartAiChat = async () => {
    if (isCreatingAiChat) return;
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
      
      router.push({
        pathname: '/chat/chat-detail',
        params: { sessionId: sessionId.toString(), receiverId: '0' }, // 0 for AI
      });

    } catch (err: any) {
      showToast('error', "Could not start AI chat", err.message);
    } finally {
      setIsCreatingAiChat(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <Text className="text-xl font-RobotoBold text-gray-900">Chats</Text>
      </View>

      {/* NEW Tab Switcher - Style from my-vehicles.tsx */}
      <View className="flex-row justify-between p-4">
        <TouchableOpacity
          className={`flex-1 p-3 rounded-lg ${activeTab === 'messages' ? 'bg-blue-600' : 'bg-gray-200'}`}
          onPress={() => setActiveTab('messages')}
        >
          <Text className={`text-center font-RobotoBold ${activeTab === 'messages' ? 'text-white' : 'text-black'}`}>
            Messages
          </Text>
        </TouchableOpacity>
        <View className="w-4" />
        <TouchableOpacity
          className={`flex-1 p-3 rounded-lg ${activeTab === 'ai' ? 'bg-blue-600' : 'bg-gray-200'}`}
          onPress={() => setActiveTab('ai')}
        >
          <Text className={`text-center font-RobotoBold ${activeTab === 'ai' ? 'text-white' : 'text-black'}`}>
            AI Assistant
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'messages' ? (
        <ChatList />
      ) : (
        <AiChatList onStartAiChat={handleStartAiChat} isLoading={isCreatingAiChat} />
      )}
    </SafeAreaView>
  );
};

export default Chat;
