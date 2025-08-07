import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { RentalConfirmationContent } from '@/types/chatData'; // Import the type
import { Ionicons } from '@expo/vector-icons';

interface RentalConfirmationChatCardProps {
  rental: RentalConfirmationContent;
}

const RentalConfirmationChatCard: React.FC<RentalConfirmationChatCardProps> = ({ rental }) => {
  const router = useRouter();

  const handlePress = () => {
    // Navigate to the rental confirmation screen with all necessary params
    router.push({
      pathname: '/(root)/(screens)/rental/rental-confirmation',
      params: {
        vehicleId: rental.vehicleId,
        title: rental.vehicle?.title || 'Vehicle Details',
        price: rental.dailyPrice,
        startDate: rental.startDateTime,
        endDate: rental.endDateTime,
        imageFront: rental.vehicle?.imageFront || '',
        owner: rental.owner?.nickname || 'Owner',
        avatar: rental.owner?.avatar || '',
        rating: rental.rating || 0,
      },
    });
  };

  return (
    <TouchableOpacity onPress={handlePress} className="w-64 bg-blue-50 rounded-xl shadow-md p-4 my-1 border border-blue-200">
      <Text className="text-lg font-RobotoBold text-blue-800 mb-2">Rental Confirmation</Text>
      <View className="flex-row items-center mb-1">
        <Ionicons name="calendar-outline" size={16} color="#1E40AF" />
        <Text className="text-sm text-gray-700 ml-2">
          {new Date(rental.startDateTime).toLocaleDateString()} - {new Date(rental.endDateTime).toLocaleDateString()}
        </Text>
      </View>
      <View className="flex-row items-center">
        <Ionicons name="cash-outline" size={16} color="#1E40AF" />
        <Text className="text-sm text-gray-700 ml-2">
          Deposit: {rental.depositPrice.toLocaleString()} VND
        </Text>
      </View>
      <Text className="text-center font-RobotoBold text-blue-600 mt-4">View Details</Text>
    </TouchableOpacity>
  );
};

export default RentalConfirmationChatCard;