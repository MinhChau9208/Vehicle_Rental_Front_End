import { View, Text, TouchableOpacity } from "react-native";
import { SessionData } from '@/types/userData';
import { Ionicons } from '@expo/vector-icons';

export const SessionItem = ({ session, isCurrent, onDelete }: { session: SessionData; isCurrent: boolean; onDelete: (deviceId: string) => void; }) => {
  return (
    <View className="flex-row justify-between items-center">
      <View className="flex-1 pr-2">
        <Text className="text-base text-gray-800 font-RobotoMedium" numberOfLines={1}>{session.deviceName}</Text>
        <Text className="text-sm text-gray-500 font-RobotoRegular mt-1">Expires: {session.expiresAt}</Text>
      </View>
      {isCurrent ? (
        <View className="bg-green-100 px-3 py-1 rounded-full">
          <Text className="text-green-800 text-xs font-RobotoBold">Current</Text>
        </View>
      ) : (
        <TouchableOpacity onPress={() => onDelete(session.deviceId)} className="p-2 rounded-full active:bg-gray-200">
          <Ionicons name="trash-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      )}
    </View>
  );
};