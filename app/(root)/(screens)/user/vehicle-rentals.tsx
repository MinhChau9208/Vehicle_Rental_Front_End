import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, Image, FlatList, ActivityIndicator, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { rentalAPI, vehicleAPI, authAPI } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { VehicleData } from '@/types/carData';
import CustomButton from '@/components/CustomButton';
import { showToast } from '@/components/ToastAlert';
import { images } from '@/constants';

interface Rental {
  id: number;
  vehicleId: number;
  renterId: number;
  startDateTime: string;
  endDateTime: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const VehicleRentals = () => {
  const params = useLocalSearchParams();
  const { vehicleId } = params;
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [renters, setRenters] = useState<Record<number, { nickname: string; avatar: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!vehicleId) {
      setError('Vehicle ID is missing');
      setLoading(false);
      return;
    }

    try {
      // Set loading to true at the start of a fetch
      setLoading(true);
      const [rentalsResponse, vehicleResponse] = await Promise.all([
        rentalAPI.getAllRentalsOfVehicle(parseInt(vehicleId as string)),
        vehicleAPI.getVehicleById(parseInt(vehicleId as string)),
      ]);

      if (vehicleResponse.data.status === 200) {
        setVehicle(vehicleResponse.data.data);
      } else {
        throw new Error('Failed to fetch vehicle details');
      }

      if (rentalsResponse.data.status === 200) {
        const rentalsData = rentalsResponse.data.data.rentals;
        setRentals(rentalsData);
        const renterIds = [...new Set(rentalsData.map((r: Rental) => r.renterId))];
        const rentersData = await Promise.all(
          renterIds.map(async (id) => {
            try {
              const response = await authAPI.getUserPublicInfo(id);
              if (response.data.status === 200) {
                return { id, nickname: response.data.data.nickname, avatar: response.data.data.avatar };
              }
            } catch (err) {
              console.error(`Error fetching user ${id}:`, err);
            }
            return { id, nickname: 'Unknown', avatar: images.avatar };
          })
        );
        const rentersMap = Object.fromEntries(rentersData.map(user => [user.id, { nickname: user.nickname, avatar: user.avatar }]));
        setRenters(rentersMap);
      } else {
        throw new Error(rentalsResponse.data.message || 'Failed to fetch rentals');
      }
    } catch (err: any) {
      setError(err.message || 'Could not load data');
      showToast('error', err.message || 'Could not load data');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  // MODIFIED: useFocusEffect will re-run fetchData every time the screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DEPOSIT PENDING':
      case 'DEPOSIT PAID':
        return '#F59E0B';
      case 'OWNER PENDING':
      case 'OWNER APPROVED':
        return '#3B82F6';
      case 'CONTRACT PENDING':
      case 'CONTRACT SIGNED':
        return '#8B5CF6';
      case 'REMAINING PAYMENT PAID':
      case 'RENTER RECEIVED':
      case 'RENTER RETURNED':
        return '#10B981';
      case 'COMPLETED':
        return '#0D9488';
      case 'CANCELLED':
        return '#EF4444';
      case 'DEPOSIT REFUNDED':
        return '#6B7280';
      default:
        return '#1F2937'; 
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DEPOSIT PENDING':
      case 'DEPOSIT PAID':
        return 'hourglass-outline';
      case 'OWNER PENDING':
      case 'OWNER APPROVED':
        return 'person-circle-outline';
      case 'CONTRACT PENDING':
      case 'CONTRACT SIGNED':
        return 'document-text-outline';
      case 'REMAINING PAYMENT PAID':
        return 'wallet-outline';
      case 'RENTER RECEIVED':
        return 'car-outline';
      case 'RENTER RETURNED':
        return 'checkmark-circle-outline';
      case 'COMPLETED':
        return 'trophy-outline';
      case 'CANCELLED':
        return 'close-circle-outline';
      case 'DEPOSIT REFUNDED':
        return 'cash-outline';
      default:
        return 'information-circle-outline';
    }
  };

  const handleRentalPress = (rentalId: number) => {
    router.push({
      pathname: '/rental/rental-details',
      params: { rentalId: rentalId.toString() },
    });
  };

  const handleToggleVisibility = async () => {
    if (!vehicle) return;
    try {
      const newHiddenStatus = !vehicle.isHidden;
      const apiCall = newHiddenStatus ? vehicleAPI.hideVehicle : vehicleAPI.unhideVehicle;
      const response = await apiCall(vehicle.id);
      if (response.data.status === 200) {
        setVehicle({ ...vehicle, isHidden: newHiddenStatus });
        showToast('success', `Vehicle ${newHiddenStatus ? 'hidden' : 'unhidden'} successfully.`);
      } else {
        throw new Error(response.data.message || 'Failed to update visibility');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Could not update vehicle visibility');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="font-RobotoMedium mt-2 text-gray-600">Loading vehicle rentals...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 p-5 justify-center items-center">
        <Text className="text-red-500 font-RobotoBold text-lg text-center">{error}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-[#2563EB] py-3 px-6 rounded-md">
          <Text className="text-white font-RobotoMedium">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-RobotoBold ml-3 flex-1 text-center text-gray-900">Vehicle Rentals</Text>
        <View className="w-10" />
      </View>

      {/* Vehicle Details Card */}
      {vehicle && (
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-md">
          <TouchableOpacity onPress={() => router.push({ pathname: '/vehicle/car-details', params: { id: vehicleId } })}>
            <Image
              source={{ uri: vehicle.imageFront || images.vinfast }}
              className="w-full h-48 rounded-lg mb-3"
              resizeMode="cover"
              onError={(e) => console.log(`Image load error for ${vehicle.imageFront}:`, e.nativeEvent.error)}
            />
          </TouchableOpacity>
          <Text className="text-xl font-RobotoBold text-gray-900 mb-2">{vehicle.title}</Text>
          <View className="flex-row items-center justify-between border-t border-gray-100 pt-3">
            <View className="flex-row items-center">
              <Ionicons name="eye-outline" size={20} color="#6B7280" />
              <Text className="text-base font-RobotoMedium text-gray-800 ml-2">
                Visibility: {vehicle.isHidden ? 'Hidden' : 'Visible'}
              </Text>
            </View>
            <Switch
              value={!vehicle.isHidden}
              onValueChange={handleToggleVisibility}
              trackColor={{ false: "#E5E7EB", true: "#2563EB" }}
              thumbColor={!vehicle.isHidden ? "#F9FAFB" : "#FFFFFF"}
            />
          </View>
          {/* Using CustomButton with className prop */}
          <CustomButton
            title="Update Vehicle Details"
            onPress={() =>
              router.push({
                pathname: '/vehicle/edit-vehicle',
                params: { vehicleId: vehicle.id.toString() },
              })
            }
            className="w-full mt-4 bg-[#2563EB] py-3 rounded-xl shadow-sm active:bg-[#1D4ED8]"
          />
        </View>
      )}

      {/* Rental List */}
      <FlatList
        data={rentals}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleRentalPress(item.id)}
            className="p-4 bg-white rounded-xl mb-4 shadow-md border border-gray-200"
          >
            <Text className="text-sm text-gray-500 font-RobotoRegular mb-2">Rental ID: {item.id}</Text>
            <View className="flex-row items-center justify-between pb-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <Image
                  source={renters[item.renterId]?.avatar ? { uri: renters[item.renterId]?.avatar } : images.avatar}
                  resizeMode='cover'
                  className="w-12 h-12 rounded-full mr-3 border border-gray-200"
                />
                <Text className="text-base font-RobotoBold text-gray-900">
                  {renters[item.renterId]?.nickname || 'Unknown Renter'}
                </Text>
              </View>
              <Text className="text-lg font-RobotoBold text-[#2563EB]">
                {item.totalPrice.toLocaleString()} VND
              </Text>
            </View>
            <View className="mt-3">
              <View className="flex-row items-center mb-1">
                <Ionicons name="calendar-outline" size={18} color="#6B7280" />
                <Text className="text-sm text-gray-700 font-RobotoRegular ml-2">
                  Start: {new Date(item.startDateTime).toLocaleString()}
                </Text>
              </View>
              <View className="flex-row items-center mb-2">
                <Ionicons name="calendar-outline" size={18} color="#6B7280" />
                <Text className="text-sm text-gray-700 font-RobotoRegular ml-2">
                  End: {new Date(item.endDateTime).toLocaleString()}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center pt-3 border-t border-gray-200">
              <Ionicons name={getStatusIcon(item.status) as any} size={20} color={getStatusColor(item.status)} />
              <Text style={{ color: getStatusColor(item.status) }} className="text-base font-RobotoBold ml-2">
                Status: {item.status}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          !loading && !error && rentals.length === 0 ? (
            <View className="flex-1 justify-center items-center py-10">
              <Ionicons name="car-outline" size={80} color="#D1D5DB" />
              <Text className="text-lg text-gray-500 font-RobotoMedium mt-4">No rentals found for this vehicle.</Text>
              <Text className="text-sm text-gray-400 font-RobotoRegular mt-2 text-center px-8">
                Once your vehicle is rented, the details will appear here.
              </Text>
            </View>
          ) : null
        )}
      />
    </SafeAreaView>
  );
};

export default VehicleRentals;
