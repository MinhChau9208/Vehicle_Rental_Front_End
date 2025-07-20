import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { vehicleAPI } from '../../api';
import { Vehicle } from '../../types/carData';

// Feather icons
import {
  ArrowLeft,
  Star,
  MapPin,
  Users,
  Settings,
  Zap,
  Clock,
  Truck,
  Info,
} from 'react-native-feather';
// Ionicons
import { Ionicons } from '@expo/vector-icons';

const CarDetails = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [car, setCar] = useState<Vehicle | null>(null);
  
  useEffect(() => {
    const fetchCarDetails = async () => {
      try {
        setLoading(true);
        const response = await vehicleAPI.getVehicleById(id);
        setCar(response.data);
        setError(null);
      } catch (err) {
        setError('Could not load car details. Please try again.');
        setCar(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchCarDetails();
  }, [id]);

  const toggleFavorite = async () => {
    if (!car) return;
    try {
      await vehicleAPI.toggleFavorite(car.id);
      setCar({ ...car, isFavorite: !car.isFavorite });
    } catch (err) {}
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#22c55e" />
        <Text className="mt-2 text-gray-500">Loading car details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !car) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white p-4">
        <Text className="text-red-500 mb-2">{error || 'Car not found'}</Text>
        <TouchableOpacity 
          className="bg-green-500 py-2 px-4 rounded-full mt-2"
          onPress={() => router.back()}
        >
          <Text className="text-white font-medium">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft stroke="#222" width={24} height={24} />
        </TouchableOpacity>
        <Text className="font-bold text-lg">Chi tiết xe</Text>
        <TouchableOpacity onPress={toggleFavorite}>
          <Ionicons
            name={car.isFavorite ? 'heart' : 'heart-outline'}
            size={28}
            color={car.isFavorite ? '#e11d48' : '#222'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {/* Car Images */}
        {car.image ? (
          <Image source={{ uri: car.image }} className="w-full h-64" resizeMode="cover" />
        ) : (
          <View className="w-full h-64 bg-gray-200 justify-center items-center">
            <Info stroke="#888" width={48} height={48} />
          </View>
        )}
        
        {/* Car Info Section */}
        <View className="p-4">
          {car.availableForDelivery && (
            <View className="flex-row items-center mb-2">
              <Truck stroke="#f59e42" width={18} height={18} />
              <Text className="text-orange-500 bg-orange-100 ml-2 px-2 py-0.5 rounded text-xs">Giao xe tận nơi</Text>
            </View>
          )}
          <Text className="font-bold text-2xl mt-2">{car.name}</Text>
          
          <View className="flex-row mt-3 space-x-4">
            <View className="flex-row items-center">
              <Settings stroke="#666" width={20} height={20} />
              <Text className="text-gray-600 ml-1">{car.transmission}</Text>
            </View>
            <View className="flex-row items-center">
              <Users stroke="#666" width={20} height={20} />
              <Text className="text-gray-600 ml-1">{car.seats} chỗ</Text>
            </View>
            <View className="flex-row items-center">
              <Zap stroke="#666" width={20} height={20} />
              <Text className="text-gray-600 ml-1">{car.fuel}</Text>
            </View>
          </View>
          
          <View className="mt-4">
            <Text className="font-semibold text-lg">Địa chỉ</Text>
            <View className="flex-row items-center mt-1">
              <MapPin stroke="#666" width={20} height={20} />
              <Text className="text-gray-600 ml-1">{car.address}</Text>
            </View>
          </View>
          
          <View className="mt-4">
            <Text className="font-semibold text-lg">Đặc điểm</Text>
            <View className="flex-row flex-wrap mt-2">
              {car.features.map((feature, index) => (
                <View key={index} className="bg-gray-100 rounded-full px-3 py-1 mr-2 mb-2">
                  <Text className="text-gray-700">{feature}</Text>
                </View>
              ))}
            </View>
          </View>
          
          <View className="mt-4">
            <Text className="font-semibold text-lg">Chủ xe</Text>
            <View className="flex-row items-center mt-2">
              <View className="w-12 h-12 rounded-full bg-purple-700 justify-center items-center">
                <Text className="text-white font-bold text-lg">{car.owner.name.charAt(0)}</Text>
              </View>
              <View className="ml-3">
                <Text className="font-semibold">{car.owner.name}</Text>
                <View className="flex-row items-center">
                  <Text className="text-amber-400 font-bold mr-1">{car.owner.rating.toFixed(1)}</Text>
                  <Star stroke="#fbbf24" fill="#fbbf24" width={16} height={16} />
                </View>
              </View>
            </View>
          </View>
          
          <View className="mt-4">
            <Text className="font-semibold text-lg">Giá thuê</Text>
            <Text className="text-green-500 font-bold text-2xl mt-1">{car.price.toLocaleString()}K/ngày</Text>
          </View>
          
          <View className="mt-4">
            <Text className="font-semibold text-lg">Thời gian nhận xe</Text>
            <View className="flex-row items-center mt-1">
              <Clock stroke="#666" width={20} height={20} />
              <Text className="text-gray-600 ml-1">{car.pickupTime}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Book Now Button */}
      <View className="p-4 border-t border-gray-200">
        <TouchableOpacity 
          className="bg-green-500 py-3 rounded-lg items-center"
          onPress={() => router.push({
            pathname: '/',
            params: { carId: car.id }
          })}
        >
          <Text className="text-white font-bold text-lg">Đặt xe ngay</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default CarDetails;
