import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { chatAPI, authAPI } from '@/services/api';
import { socketService } from '@/services/socketService';
import { images } from '@/constants';
import { showToast } from '@/components/ToastAlert';
import { Ionicons, Feather } from '@expo/vector-icons';
import { ChatMessage, VehicleContent, RentalConfirmationContent } from '@/types/chatData';
import VehicleChatCard from '@/components/vehicle/VehicleChatCard'; // Import new component
import RentalConfirmationChatCard from '@/components/vehicle/RentalConfirmationChatCard';
import { useAppContext } from '@/components/AppContext';

interface UserInfo {
  nickname: string;
  avatar?: string;
}

const ChatDetail = () => {
  const router = useRouter();
  const { sessionId, receiverId } = useLocalSearchParams();
  const { setActiveChatSessionId } = useAppContext();
  const sessionIdNum = Number(sessionId);
  const receiverIdNum = Number(receiverId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [receiverInfo, setReceiverInfo] = useState<UserInfo>({ nickname: 'Loading...', avatar: undefined });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSending, setIsSending] = useState(false);

  const isAiChat = receiverIdNum === 0;

  useEffect(() => {
    // Set the active session ID when the component mounts
    setActiveChatSessionId(sessionIdNum);
    // Clear the active session ID when the component unmounts
    return () => {
      setActiveChatSessionId(null);
    };
  }, [sessionIdNum, setActiveChatSessionId]);

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        const userResponse = await authAPI.getUser();
        if (userResponse.data?.status === 200 && userResponse.data?.data) {
          setUserId(userResponse.data.data.id);
        }

        const receiverResponse = await authAPI.getUserPublicInfo(receiverIdNum);
        if (receiverResponse.data?.status === 200 && receiverResponse.data?.data) {
          setReceiverInfo(receiverResponse.data.data);
        }
      } catch (error) {
        console.error('Error initializing chat info:', error);
        showToast('error', 'Could not load chat details.');
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, [receiverIdNum, isAiChat]);

  useEffect(() => {
    if (!userId) return;

    // Request the first page of messages
    socketService.joinSession(sessionIdNum, 1);

    const handleSessionMessages = (data: { sessionId: number; messages: ChatMessage[]; currentPage: number; totalPages: number; }) => {
      if (data.sessionId === sessionIdNum) {
        // Prevent duplicates when loading more or receiving initial batch
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMessages = data.messages.filter((m: ChatMessage) => !existingIds.has(m.id));
          const combined = [...prev, ...newMessages];
          // Sort all messages by date to ensure correct order
          return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });
        setCurrentPage(data.currentPage);
        setTotalPages(data.totalPages);
        setIsLoadingMore(false);
      }
    };

    const handleMessageUpdate = (data: { sessionId: number; data: ChatMessage; }) => {
      if (data.sessionId === sessionIdNum) {
        // Add the new message to the top of the list (since it's inverted)
        setMessages((prev) => [data.data, ...prev]);
      }
    };

    socketService.onChatSessionMessage(handleSessionMessages);
    socketService.onChatSessionMessageUpdate(handleMessageUpdate);

    return () => {
      socketService.off('chatSessionMessage');
      socketService.off('chatSessionMessageUpdate');
    };
  }, [userId, sessionIdNum]);

  const loadMoreMessages = useCallback(() => {
    if (isLoadingMore || currentPage >= totalPages) return;
    console.log(`Loading page ${currentPage + 1}...`);
    setIsLoadingMore(true);
    socketService.joinSession(sessionIdNum, currentPage + 1);
  }, [isLoadingMore, currentPage, totalPages, sessionIdNum]);

  const handleSendMessage = async () => {
    if (!userId || isSending) return;
    const messageToSend = newMessage.trim();

    if (!messageToSend && !selectedImageUri) return;

    setIsSending(true);
    try {
      if (isAiChat) {
        console.log('Sending AI message:', sessionIdNum, messageToSend);
        await chatAPI.sendMessageAI({ sessionId: sessionIdNum, content: messageToSend });
        setNewMessage('');
      } else {
        if (selectedImageUri) {
          const imageData = { uri: selectedImageUri, name: 'image.jpg', type: 'image/jpeg' } as any;
          await chatAPI.sendMessage({ sessionId: sessionIdNum, type: 'image', image: imageData });
          setSelectedImageUri(null);
        } else if (messageToSend) {
          await chatAPI.sendMessage({ sessionId: sessionIdNum, type: 'text', content: messageToSend });
          setNewMessage('');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('error', 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0].uri) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isSent = item.senderId === userId;

    const renderContent = () => {
      switch (item.type) {
        case 'image':
          return <Image source={{ uri: item.content as string }} className="w-48 h-48 rounded-[14px]" />;
        
        case 'vehicle':
          // The content for 'vehicle' is an array of vehicle objects
          const vehicles = item.content as VehicleContent[];
          return (
            <View>
              {vehicles.map((vehicle) => (
                <VehicleChatCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </View>
          );

        case 'rental-confirmation':
          // The content is a single rental confirmation object
          const rental = item.content as RentalConfirmationContent;
          return <RentalConfirmationChatCard rental={rental} />;
          
        case 'text':
        default:
          return (
            <Text className={`px-3 py-2 text-base ${isSent ? 'text-white' : 'text-black'}`}>
              {item.content as string}
            </Text>
          );
      }
    };

    return (
      <View className={`flex-row items-end mb-4 mx-4 ${isSent ? 'justify-end' : 'justify-start'}`}>
        {!isSent && (
          <Image
            source={receiverInfo.avatar ? { uri: receiverInfo.avatar } : images.avatar}
            className="w-8 h-8 rounded-full mr-2 self-start mt-1"
          />
        )}
        {/*
          The container now adapts its background based on content type.
          No background for vehicle/rental cards, as they have their own styling.
        */}
        <View 
          className={`max-w-[80%] p-1 rounded-2xl ${
            item.type === 'text' ? (isSent ? 'bg-blue-500' : 'bg-gray-200') : ''
          }`}
        >
          {renderContent()}
        </View>
      </View>
    );
  };

  if (loading) {
    return <SafeAreaView className="flex-1 bg-white justify-center items-center"><ActivityIndicator size="large" color="#2563EB" /></SafeAreaView>;
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center p-3 border-b border-gray-200 shadow-sm bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Image
          source={receiverInfo.avatar ? { uri: receiverInfo.avatar } : images.avatar}
          className="w-10 h-10 rounded-full ml-2"
        />
        <Text className="text-lg font-RobotoBold ml-3">{receiverInfo.nickname}</Text>
      </View>

      <FlatList
        inverted
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        className="flex-1"
        onEndReached={loadMoreMessages}
        onEndReachedThreshold={3}
        ListFooterComponent={
          isLoadingMore ? <ActivityIndicator size="small" color="#9CA3AF" className="my-4" /> : null
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="p-2 bg-white border-t border-gray-200">
          {selectedImageUri && (
            <View className="p-2 relative w-24 h-24">
              <Image source={{ uri: selectedImageUri }} className="w-full h-full rounded-lg" />
              <TouchableOpacity
                onPress={() => setSelectedImageUri(null)}
                className="absolute -top-1 -right-1 bg-gray-700 rounded-full p-1"
              >
                <Feather name="x" size={16} color="white" />
              </TouchableOpacity>
            </View>
          )}
          <View className="flex-row items-center">
            {!isAiChat && (
              <TouchableOpacity onPress={handleSelectImage} className="p-2">
                <Feather name="paperclip" size={24} color="#4B5563" />
              </TouchableOpacity>
            )}
            <TextInput
              className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-base text-black"
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              multiline
            />
            <TouchableOpacity onPress={handleSendMessage} disabled={isSending} className="p-2 ml-2">
              {isSending ? <ActivityIndicator size="small" /> : <Feather name="send" size={24} color="#2563EB" />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatDetail;
