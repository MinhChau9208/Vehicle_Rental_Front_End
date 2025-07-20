import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { rentalAPI, vehicleAPI, authAPI } from '@/services/api';
import { showToast } from '@/components/ToastAlert';
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons
import { images } from '@/constants'; // Import images for placeholder
import { router } from 'expo-router';

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
  vehicle?: {
    title: string;
    imageFront: string;
  };
  renter?: {
    nickname: string;
    avatar: string;
  };
}

const PendingRequests = () => {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPendingRentals = useCallback(async () => {
    try {
      setLoading(true);
      const response = await rentalAPI.getOwnerPendingRentals();
      if (response.data.status === 200) {
        const fetchedRentals = response.data.data.rentals;
        // Fetch vehicle and renter info for each rental
        const rentalsWithDetails = await Promise.all(
          fetchedRentals.map(async (rental: Rental) => {
            const vehicleRes = await vehicleAPI.getVehicleById(rental.vehicleId);
            const renterRes = await authAPI.getUserPublicInfo(rental.renterId);
            return {
              ...rental,
              vehicle: vehicleRes.data.status === 200 ? { title: vehicleRes.data.data.title, imageFront: vehicleRes.data.data.imageFront } : { title: 'Unknown Vehicle', imageFront: images.vinfast },
              renter: renterRes.data.status === 200 ? { nickname: renterRes.data.data.nickname, avatar: renterRes.data.data.avatar } : { nickname: 'Unknown Renter', avatar: images.avatar },
            };
          })
        );
        setRentals(rentalsWithDetails);
      } else {
        throw new Error('Failed to fetch pending rentals');
      }
    } catch (err: any) {
      setError(err.message || 'Could not load pending rentals');
      showToast('error', err.message || 'Could not load pending rentals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingRentals();
  }, [fetchPendingRentals]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setError(null);
    fetchPendingRentals();
  }, [fetchPendingRentals]);

  const handleRentalDecision = async (rentalId: number, status: boolean) => {
    try {
      const response = await rentalAPI.ownerRentalDecision(rentalId, status);
      if (response.data.status === 200) {
        showToast('success', `Rental ${status ? 'confirmed' : 'rejected'} successfully.`);
        // Remove the rental from the list after decision
        setRentals((prev) => prev.filter((rental) => rental.id !== rentalId));
      } else {
        throw new Error(response.data.message || 'Failed to make decision');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Could not process rental decision');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DEPOSIT PENDING':
      case 'DEPOSIT PAID':
        return '#F59E0B'; // Amber
      case 'OWNER PENDING':
      case 'OWNER APPROVED':
        return '#3B82F6'; // Blue
      case 'CONTRACT PENDING':
      case 'CONTRACT SIGNED':
        return '#8B5CF6'; // Purple
      case 'REMAINING PAYMENT PAID':
      case 'RENTER RECEIVED':
      case 'RENTER RETURNED':
        return '#10B981'; // Green
      case 'COMPLETED':
        return '#0D9488'; // Teal
      case 'CANCELLED':
        return '#EF4444'; // Red
      case 'DEPOSIT REFUNDED':
        return '#6B7280'; // Gray
      default:
        return '#1F2937'; // Dark Gray
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="font-RobotoMedium mt-2 text-gray-600">Loading pending requests...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 p-5 justify-center items-center">
        <Text className="text-red-500 font-RobotoBold text-lg text-center">{error}</Text>
        <TouchableOpacity onPress={onRefresh} className="mt-4 bg-[#2563EB] py-3 px-6 rounded-md">
          <Text className="text-white font-RobotoMedium">Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (rentals.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 p-5">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-xl font-RobotoBold text-gray-900">Pending Requests</Text>
        </View>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Image
            source={images.noResult} // Assuming this is a local image asset
            alt="No Pending Requests"
            className="w-64 h-64" // Adjusted size
            resizeMode="contain"
          />
          <Text className="text-2xl font-RobotoBold text-gray-800 mt-6">
            No Pending Requests
          </Text>
          <Text className="text-base mt-2 text-center px-7 text-gray-600">
            All caught up! No new rental requests at the moment.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <FlatList
        data={rentals}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
        renderItem={({ item }) => (
          // MODIFIED: Wrapped card in TouchableOpacity
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/rental/rental-details', params: { rentalId: item.id.toString() } })}
            className="p-4 bg-white rounded-xl mb-4 shadow-md border border-gray-200 active:opacity-70"
          >
            {item.vehicle && (
              <View className="flex-row items-center mb-3">
                <Image
                  source={{ uri: item.vehicle.imageFront }}
                  className="w-16 h-16 rounded-lg mr-3 border border-gray-200"
                />
                <View className="flex-1">
                  <Text className="text-lg font-RobotoBold text-gray-900">{item.vehicle.title}</Text>
                  <Text className="text-sm text-gray-600">Rental ID: {item.id}</Text>
                </View>
              </View>
            )}

            <View className="flex-row items-center mb-1">
              <Ionicons name="person-outline" size={18} color="#6B7280" />
              <Text className="text-base font-RobotoMedium text-gray-800 ml-2">
                Renter: {item.renter?.nickname || 'Unknown'}
              </Text>
            </View>
            <View className="flex-row items-center mb-1">
              <Ionicons name="calendar-outline" size={18} color="#6B7280" />
              <Text className="text-sm text-gray-700 ml-2">
                Start: {new Date(item.startDateTime).toLocaleString()}
              </Text>
            </View>
            <View className="flex-row items-center mb-2">
              <Ionicons name="pricetag-outline" size={18} color="#6B7280" />
              <Text className="text-base font-RobotoBold text-[#2563EB] ml-2">
                Total Price: {item.totalPrice.toLocaleString()} VND
              </Text>
            </View>

            <View className="flex-row justify-between mt-4 pt-3 border-t border-gray-200">
              <TouchableOpacity
                className="bg-[#10B981] py-3 px-6 rounded-lg flex-1 mr-2 shadow-sm active:bg-green-600"
                onPress={() => handleRentalDecision(item.id, true)}
              >
                <Text className="text-white font-RobotoBold text-center text-base">Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-[#EF4444] py-3 px-6 rounded-lg flex-1 ml-2 shadow-sm active:bg-red-600"
                onPress={() => handleRentalDecision(item.id, false)}
              >
                <Text className="text-white font-RobotoBold text-center text-base">Reject</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          !loading && !error && rentals.length === 0 ? (
            <View className="flex-1 justify-center items-center py-10">
              <Ionicons name="checkmark-done-circle-outline" size={80} color="#D1D5DB" />
              <Text className="text-lg text-gray-500 font-RobotoMedium mt-4">No Pending Requests</Text>
            </View>
          ) : null
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
        }
      />
    </SafeAreaView>
  );
};

export default PendingRequests;
