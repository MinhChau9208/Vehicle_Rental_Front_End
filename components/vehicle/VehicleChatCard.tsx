import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { VehicleContent } from '@/types/chatData'; // Import the type
import { Ionicons } from '@expo/vector-icons';

interface VehicleChatCardProps {
  vehicle: VehicleContent;
}

const VehicleChatCard: React.FC<VehicleChatCardProps> = ({ vehicle }) => {
  const router = useRouter();

  const handlePress = () => {
    router.push({
      pathname: '/(root)/(screens)/vehicle/car-details',
      params: { id: vehicle.id },
    });
  };

  return (
    <TouchableOpacity onPress={handlePress} className="w-64 bg-white rounded-xl shadow-md overflow-hidden my-1">
      <Image source={{ uri: vehicle.imageFront }} className="w-full h-32" resizeMode="cover" />
      <View className="p-3">
        <Text className="text-base font-RobotoBold text-gray-900" numberOfLines={1}>
          {vehicle.title}
        </Text>
        <Text className="text-sm font-RobotoMedium text-primary-500 mt-1">
          {vehicle.price.toLocaleString()} VND / Day
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default VehicleChatCard;