import { icons, images } from "@/constants"
import { UserData, VehicleData } from "@/types/carData"
import { Ionicons, MaterialIcons } from "@expo/vector-icons"
import { View, Text, TouchableOpacity, Image } from "react-native"

interface Props {
  onPress?: () => void
  vehicle: VehicleData
  user: UserData
  views?: number
  rating?: number
  isFavorite: boolean
  onFavoriteToggle: (vehicleId: number) => void
}
const Cards = ({ onPress, vehicle, user, rating, isFavorite, onFavoriteToggle }: Props) => {
  return (
    <TouchableOpacity onPress={onPress} className="flex-1 w-full mt-4 px-3 py-4 rounded-lg bg-white shadow-lg">
      <View className="flex flex-row items-center absolute px-2 top-5 right-5 bg-white/90 p-1 rounded-full z-50">
        <Ionicons name="star" size={14} color={"#FFD900"} className="w-4 h-4" />
        <Text className="text-xs font-RobotoMedium text-primary-500 ml-0.5">
          {rating !== 0 && rating !== null ? rating.toFixed(1) : 'N/A'}
        </Text>
      </View>

      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation(); // Prevents the card's onPress from firing
          onFavoriteToggle(vehicle.id);
        }}
        className="absolute top-5 left-5 bg-white/90 p-1.5 rounded-full z-50"
      >
        <MaterialIcons
          name={isFavorite ? "favorite" : "favorite-border"}
          size={22}
          color={isFavorite ? "#EF4444" : "#4B5563"}
        />
      </TouchableOpacity>

      <Image source={{ uri: vehicle.imageFront }} className="w-full h-40 rounded-lg" resizeMode="cover" />

      <View className="flex flex-row items-center mt-3">
        <Image
          source={user?.avatar ? { uri: user.avatar } : images.avatar}
          className="w-9 h-9 rounded-full mr-3"
        />
        <View className="flex-1">
          <Text className="font-RobotoMedium text-base" numberOfLines={1} ellipsizeMode="tail">
            {vehicle.title}
          </Text>
          <Text className="font-Roboto text-sm text-gray-600">
            {user?.nickname || 'Unknown User'}
          </Text>
        </View>
      </View>
      
      <View className="flex flex-row items-center justify-start mt-2">
        <Text className="font-RobotoBold text-primary-500">
          {(vehicle.price || 0).toLocaleString()} VND / Day
        </Text>
      </View>
    </TouchableOpacity>
  )
}
export default Cards